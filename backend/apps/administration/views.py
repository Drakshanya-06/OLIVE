import csv
import re
import secrets

from django.http import HttpResponse
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.dashboard.views import last_months, material_totals, monthly_series, month_key
from apps.recycling.services import enrich
from apps.rewards.services import ledger_add
from database.repositories import (admin_logs, challenges, coupons, device_materials, devices, educational_articles,
                                   facilities, notifications, quizzes, recycling_requests, reward_balances,
                                   reward_transactions, users, facility_reviews)
from database.repository import serialize, to_oid, utcnow
from utils.constants import CATEGORY_KEYS, REQUEST_STATUSES
from utils.errors import ApiError
from utils.permissions import IsAdmin, IsSuperAdmin
from utils.platform import DEFAULT_SETTINGS, audit, get_settings, notify, save_settings
from utils.validators import validate
from .crud import make_crud

# ------------------------------------------------------------------ schemas + pre-save hooks
FACILITY = {
    "name": {"required": True, "min": 2, "max": 120},
    "facility_type": {"required": True, "choices": ["government", "private", "ngo"]},
    "description": {"max": 600},
    "address": {"required": True, "max": 300},
    "city": {"required": True, "max": 80}, "state": {"max": 80}, "pincode": {"type": "pin"},
    "latitude": {"type": "float", "required": True, "min": -90, "max": 90},
    "longitude": {"type": "float", "required": True, "min": -180, "max": 180},
    "phone": {"max": 30}, "email": {"max": 120}, "website": {"max": 200},
    "operating_hours": {"max": 120},
    "operating_status": {"choices": ["operational", "temporarily_closed", "closed"], "default": "operational"},
    "accepted_categories": {"type": "list", "required": True},
    "verification_status": {"choices": ["verified", "pending", "unverified", "sample"], "default": "pending"},
    "data_source": {"max": 300},
    "is_sample": {"type": "bool", "default": False},
    "is_active": {"type": "bool", "default": True},
}


def facility_pre(d, current, request):
    if "accepted_categories" in d:
        bad = [c for c in d["accepted_categories"] if c not in CATEGORY_KEYS]
        if bad:
            raise ApiError("Unknown category: " + ", ".join(map(str, bad)), 400, "validation_error", {"accepted_categories": "Invalid category."})
    status = d.get("verification_status", (current or {}).get("verification_status"))
    source = d.get("data_source", (current or {}).get("data_source"))
    if status == "verified" and not source:
        raise ApiError("A verified facility needs a data source (e.g. the official authorisation list).", 400, "validation_error",
                       {"data_source": "Required to mark as verified."})
    if status == "verified" and (not current or current.get("verification_status") != "verified"):
        d["verified_at"], d["verified_by"] = utcnow(), request.user.oid
    if not current:
        d.setdefault("rating_avg", 0)
        d.setdefault("rating_count", 0)
    return d


MATERIAL = {
    "category": {"required": True, "choices": CATEGORY_KEYS},
    "brand": {"max": 60}, "model": {"max": 80},
    "is_category_default": {"type": "bool", "default": False},
    "weight_g": {"type": "float", "min": 1, "max": 100000},
    "materials_mg": {"type": "dict", "required": True},
    "recovery_rate": {"type": "float", "min": 0, "max": 1},
    "data_source": {"required": True, "max": 300},
    "is_placeholder": {"type": "bool", "default": True},
    "is_active": {"type": "bool", "default": True},
}


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def material_pre(d, current, request):
    if "materials_mg" in d:
        try:
            d["materials_mg"] = {str(k).lower()[:30]: float(v) for k, v in d["materials_mg"].items()}
            if any(v < 0 for v in d["materials_mg"].values()):
                raise ValueError
        except (TypeError, ValueError):
            raise ApiError("materials_mg must map material names to non-negative numbers (milligrams).", 400, "validation_error")
    is_default = d.get("is_category_default", (current or {}).get("is_category_default", False))
    if is_default:
        d["brand"], d["model"], d["brand_key"], d["model_key"] = "Category average", "default", "", ""
    else:
        brand = d.get("brand", (current or {}).get("brand"))
        model = d.get("model", (current or {}).get("model"))
        if not brand or not model:
            raise ApiError("Brand and model are required for model-specific data.", 400, "validation_error")
        d["brand_key"], d["model_key"] = norm(brand), norm(model)
    return d


def slugify(title):
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:70] or "item"


def unique_slug(repo, title, current):
    base = slugify(title)
    slug = base
    while repo.find_one({"slug": slug, **({"_id": {"$ne": current["_id"]}} if current else {})}):
        slug = f"{base}-{secrets.token_hex(2)}"
    return slug


ARTICLE = {
    "title": {"required": True, "min": 3, "max": 140},
    "category": {"required": True, "choices": ["awareness", "hazards", "recycling", "tutorial", "policy"]},
    "summary": {"required": True, "max": 300},
    "content": {"required": True, "max": 20000},
    "cover_icon": {"max": 30}, "read_minutes": {"type": "int", "min": 1, "max": 120, "default": 4},
    "published": {"type": "bool", "default": True},
}


def article_pre(d, current, request):
    if "title" in d and (not current or d["title"] != current.get("title")):
        d["slug"] = unique_slug(educational_articles, d["title"], current)
    return d


QUIZ = {
    "title": {"required": True, "min": 3, "max": 140}, "description": {"max": 300},
    "pass_mark": {"type": "int", "min": 1, "max": 100, "default": 70},
    "questions": {"type": "list", "required": True, "max": 30},
    "published": {"type": "bool", "default": True},
}


def quiz_pre(d, current, request):
    if "questions" in d:
        clean = []
        for i, q in enumerate(d["questions"], 1):
            if not isinstance(q, dict):
                raise ApiError(f"Question {i} is invalid.", 400, "validation_error")
            opts = q.get("options")
            ci = q.get("correct_index")
            if (not str(q.get("question", "")).strip() or not isinstance(opts, list) or not 2 <= len(opts) <= 6
                    or not all(isinstance(o, str) and o.strip() for o in opts)
                    or not isinstance(ci, int) or isinstance(ci, bool) or not 0 <= ci < len(opts)):
                raise ApiError(f"Question {i} needs text, 2-6 options and a valid correct answer.", 400, "validation_error")
            clean.append({"question": str(q["question"]).strip()[:300], "options": [o.strip()[:200] for o in opts],
                          "correct_index": ci, "explanation": str(q.get("explanation", ""))[:400]})
        d["questions"] = clean
    if "title" in d and (not current or d["title"] != current.get("title")):
        d["slug"] = unique_slug(quizzes, d["title"], current)
    return d


CHALLENGE = {
    "title": {"required": True, "min": 3, "max": 120}, "description": {"max": 400},
    "type": {"required": True, "choices": ["recycle_devices", "quiz_passed", "read_articles"]},
    "target": {"type": "int", "required": True, "min": 1, "max": 1000},
    "bonus_points": {"type": "int", "min": 0, "max": 5000, "default": 0},
    "start_date": {"type": "date", "required": True}, "end_date": {"type": "date", "required": True},
    "active": {"type": "bool", "default": True},
}


def challenge_pre(d, current, request):
    start = d.get("start_date", (current or {}).get("start_date"))
    end = d.get("end_date", (current or {}).get("end_date"))
    if start and end and end < start:
        raise ApiError("End date must be after the start date.", 400, "validation_error", {"end_date": "Must be after start date."})
    return d


COUPON = {
    "title": {"required": True, "min": 3, "max": 120}, "description": {"max": 300},
    "code": {"required": True, "min": 3, "max": 30},
    "points_cost": {"type": "int", "required": True, "min": 1, "max": 100000},
    "stock": {"type": "int", "required": True, "min": 0, "max": 1000000},
    "expires_at": {"type": "date", "nullable": True}, "active": {"type": "bool", "default": True},
    "is_sample": {"type": "bool", "default": False},
}


def coupon_pre(d, current, request):
    if "code" in d:
        d["code"] = d["code"].upper().replace(" ", "-")
    d.setdefault("redeemed_count", 0) if not current else None
    return d


def _guard_articles(pk):
    pass


FacilityList, FacilityDetail = make_crud(facilities, FACILITY, "facility", ("name", "city", "pincode"),
                                         ("facility_type", "verification_status", "city", "is_active"), [("name", 1)], facility_pre)
MaterialList, MaterialDetail = make_crud(device_materials, MATERIAL, "device_reference", ("brand", "model"),
                                         ("category", "is_category_default"), [("category", 1), ("brand", 1)], material_pre)
ArticleList, ArticleDetail = make_crud(educational_articles, ARTICLE, "article", ("title", "summary"), ("category", "published"), None, article_pre)
QuizList, QuizDetail = make_crud(quizzes, QUIZ, "quiz", ("title",), ("published",), None, quiz_pre)
ChallengeList, ChallengeDetail = make_crud(challenges, CHALLENGE, "challenge", ("title",), ("active", "type"), [("end_date", -1)], challenge_pre)
CouponList, CouponDetail = make_crud(coupons, COUPON, "coupon", ("title", "code"), ("active",), None, coupon_pre)


# ------------------------------------------------------------------ dashboard / reports
def status_counts():
    return {s: recycling_requests.count({"status": s}) for s in REQUEST_STATUSES}


class DashboardView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        reqs = recycling_requests.find({})
        sc = {s: 0 for s in REQUEST_STATUSES}
        for r in reqs:
            sc[r["status"]] += 1
        done = [r for r in reqs if r["status"] in ("verified", "completed")]
        est, ver = material_totals(reqs)
        issued = sum(t["points"] for t in reward_transactions.find({"points": {"$gt": 0}}))
        fac = facilities.find({})
        recent = sorted(reqs, key=lambda r: r["created_at"], reverse=True)[:6]
        return Response({
            "totals": {"users": users.count({"role": "user", "is_verified": True}), "requests": len(reqs),
                       "completed": len(done), "pending": sc["submitted"] + sc["under_review"] + sc["approved"] + sc["collected"],
                       "devices_recycled": len(done), "points_issued": issued, "devices_analyzed": devices.count({})},
            "status_counts": sc,
            "materials": {"estimated_recoverable": est, "verified_recovered": ver},
            "facility_stats": {"total": len(fac), "verified": sum(f.get("verification_status") == "verified" for f in fac),
                               "sample": sum(bool(f.get("is_sample")) for f in fac),
                               "by_type": {t: sum(f.get("facility_type") == t for f in fac) for t in ("government", "private", "ngo")}},
            "monthly": monthly_series(reqs),
            "recent_requests": enrich(recent, with_user=True),
            "recent_activity": serialize(admin_logs.find({}, sort=[("created_at", -1)], limit=8)),
        })


class ReportsView(APIView):
    """GET /api/admin/reports/  (?export=csv downloads all requests as CSV)."""
    permission_classes = [IsAdmin]

    def get(self, request):
        reqs = recycling_requests.find({}, sort=[("created_at", -1)])
        if request.query_params.get("export") == "csv":
            rows = enrich(reqs, with_user=True)
            resp = HttpResponse(content_type="text/csv")
            resp["Content-Disposition"] = 'attachment; filename="olive-recycling-requests.csv"'
            w = csv.writer(resp)
            w.writerow(["request_code", "status", "user_email", "device", "facility", "method", "estimated_points", "final_points", "created_at", "verified_at"])
            for r in rows:
                dv = r.get("device") or {}
                w.writerow([r["request_code"], r["status"], (r.get("user") or {}).get("email", ""),
                            f"{dv.get('category', '')} {dv.get('brand', '')} {dv.get('model', '')}".strip(),
                            (r.get("facility") or {}).get("name", ""), r["method"], r.get("estimated_points", 0), r.get("final_points", ""),
                            r["created_at"], r.get("verified_at", "")])
            return resp
        by_fac = {}
        for r in reqs:
            f = by_fac.setdefault(str(r["facility_id"]), {"requests": 0, "verified": 0})
            f["requests"] += 1
            f["verified"] += r["status"] in ("verified", "completed")
        names = {str(f["_id"]): f["name"] for f in facilities.find({})}
        est, ver = material_totals(reqs)
        issued = sum(t["points"] for t in reward_transactions.find({"points": {"$gt": 0}}))
        redeemed = -sum(t["points"] for t in reward_transactions.find({"type": "redeem"}))
        return Response({
            "status_counts": status_counts(), "monthly": monthly_series(reqs),
            "by_facility": [{"facility": names.get(k, "Deleted facility"), **v} for k, v in sorted(by_fac.items(), key=lambda x: -x[1]["requests"])],
            "materials": {"estimated_recoverable": est, "verified_recovered": ver},
            "points": {"issued": issued, "redeemed": redeemed},
            "methods": {m: sum(r["method"] == m for r in reqs) for m in ("drop_off", "pickup")},
        })


class AnalyticsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        keys = last_months(12)
        growth = {k: 0 for k in keys}
        for u in users.find({"role": "user"}):
            k = month_key(u["created_at"])
            if k in growth:
                growth[k] += 1
        cats = {}
        for d in devices.col.find({}, {"category": 1}):
            cats[d["category"]] = cats.get(d["category"], 0) + 1
        return Response({"user_growth": [{"month": k, "users": growth[k]} for k in keys],
                         "device_categories": [{"category": k, "count": v} for k, v in sorted(cats.items(), key=lambda x: -x[1])],
                         "reviews": facility_reviews.count({})})


# ------------------------------------------------------------------ users
class UserListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        p = request.query_params
        flt = {}
        if p.get("role") in ("user", "admin", "super_admin"):
            flt["role"] = p["role"]
        if p.get("q"):
            rx = {"$regex": re.escape(p["q"].strip()), "$options": "i"}
            flt["$or"] = [{"name": rx}, {"email": rx}]
        return Response(users.paginate(request, flt, sort=[("created_at", -1)], default_size=20))


class UserDetailView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        u = users.get(pk, "User")
        out = serialize(u)
        out["request_count"] = recycling_requests.count({"user_id": u["_id"]})
        b = reward_balances.find_one({"user_id": u["_id"]}) or {}
        out["points_available"] = b.get("available", 0)
        return Response(out)

    def put(self, request, pk):
        u = users.get(pk, "User")
        d = validate(request.data, {"is_active": {"type": "bool"}, "role": {"choices": ["user", "admin", "super_admin"]}}, partial=True)
        if u["_id"] == request.user.oid:
            raise ApiError("You cannot change your own role or status.", 400, "not_allowed")
        if "role" in d and not request.user.is_super_admin:
            raise ApiError("Only a super administrator can change roles.", 403, "forbidden")
        if u["role"] == "super_admin" and not request.user.is_super_admin:
            raise ApiError("Only a super administrator can modify a super administrator.", 403, "forbidden")
        doc = users.update(pk, d)
        audit(request, "user.update", "user", pk, d)
        return Response(serialize(doc))


# ------------------------------------------------------------------ rewards admin
class LedgerView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        flt = {}
        p = request.query_params
        if p.get("type") in ("earn", "redeem", "bonus", "adjustment"):
            flt["type"] = p["type"]
        if p.get("user_id"):
            flt["user_id"] = to_oid(p["user_id"])
        data = reward_transactions.paginate(request, flt, sort=[("created_at", -1)], default_size=20, transform=lambda d: d)
        umap = {u["_id"]: u for u in users.find({"_id": {"$in": [t["user_id"] for t in data["results"]]}})}
        data["results"] = [{**serialize(t), "user_email": umap.get(t["user_id"], {}).get("email", "")} for t in data["results"]]
        return Response(data)


class AdjustPointsView(APIView):
    """Super admin only. Manual correction with mandatory reason, always written to the ledger + audit log."""
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        d = validate(request.data, {"user_id": {"type": "oid", "required": True},
                                    "points": {"type": "int", "required": True, "min": -100000, "max": 100000},
                                    "reason": {"required": True, "min": 5, "max": 200}})
        if d["points"] == 0:
            raise ApiError("Points cannot be zero.", 400, "validation_error")
        users.get(d["user_id"], "User")
        if d["points"] < 0:
            ok = reward_balances.col.find_one({"user_id": d["user_id"], "available": {"$gte": -d["points"]}})
            if not ok:
                raise ApiError("User does not have enough points for this deduction.", 400, "insufficient_points")
        tx = ledger_add(d["user_id"], d["points"], "adjustment", f"Admin adjustment: {d['reason']}", adjusted_by=request.user.oid)
        notify(d["user_id"], "reward", "Points adjusted", f"{d['points']:+d} points. {d['reason']}", "/rewards")
        audit(request, "points.adjust", "user", d["user_id"], {"points": d["points"], "reason": d["reason"]})
        return Response(serialize(tx), status=201)


# ------------------------------------------------------------------ settings, broadcast, logs
class SettingsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response({"values": get_settings(), "defaults": DEFAULT_SETTINGS})

    def put(self, request):
        if not request.user.is_super_admin:
            raise ApiError("Only a super administrator can change platform settings.", 403, "forbidden")
        d = validate(request.data, {
            "points_per_inr": {"type": "float", "min": 0, "max": 1000},
            "max_points_per_request": {"type": "int", "min": 0, "max": 1000000},
            "default_recovery_rate": {"type": "float", "min": 0, "max": 1},
            "co2e_kg_avoided_per_kg_recycled": {"type": "float", "min": 0, "max": 1000},
            "landfill_diverted_share": {"type": "float", "min": 0, "max": 1},
            "max_pickup_days_ahead": {"type": "int", "min": 1, "max": 365},
            "leaderboard_size": {"type": "int", "min": 3, "max": 50},
            "material_prices_inr_per_g": {"type": "dict"}, "condition_multipliers": {"type": "dict"},
        }, partial=True)
        for key in ("material_prices_inr_per_g", "condition_multipliers"):
            if key in d:
                try:
                    d[key] = {str(k).lower(): float(v) for k, v in d[key].items()}
                    if any(v < 0 for v in d[key].values()):
                        raise ValueError
                except (TypeError, ValueError):
                    raise ApiError(f"{key} must map names to non-negative numbers.", 400, "validation_error")
        current = get_settings()
        current.update(d)
        save_settings(current)
        audit(request, "settings.update", "settings", None, {"fields": list(d.keys())})
        return Response({"values": get_settings()})


class BroadcastView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        d = validate(request.data, {"title": {"required": True, "max": 100}, "message": {"required": True, "max": 400},
                                    "user_id": {"type": "oid"}})
        targets = [d["user_id"]] if d.get("user_id") else [u["_id"] for u in users.col.find({"role": "user", "is_active": {"$ne": False}, "is_verified": True}, {"_id": 1})]
        if targets:
            now = utcnow()
            notifications.col.insert_many([{"user_id": t, "type": "announcement", "title": d["title"], "message": d["message"],
                                            "link": None, "is_read": False, "created_at": now, "updated_at": now} for t in targets])
        audit(request, "notification.broadcast", "notification", None, {"recipients": len(targets)})
        return Response({"sent": len(targets)}, status=201)


class LogsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(admin_logs.paginate(request, {}, sort=[("created_at", -1)], default_size=30))
