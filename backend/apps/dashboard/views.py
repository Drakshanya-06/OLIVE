from datetime import datetime, timezone

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.learning.services import level_for, verified_count
from apps.recycling.services import enrich
from apps.rewards.services import get_balance
from apps.rewards.views import pending_points
from database.repositories import devices, facilities, notifications, recycling_requests, reward_transactions, user_achievements, users
from database.repository import serialize, utcnow
from utils.platform import get_settings


def month_key(dt):
    return dt.strftime("%Y-%m")


def last_months(n=12):
    now = utcnow()
    y, m = now.year, now.month
    keys = []
    for _ in range(n):
        keys.append(f"{y:04d}-{m:02d}")
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    return list(reversed(keys))


def monthly_series(reqs, n=12):
    keys = last_months(n)
    submitted = {k: 0 for k in keys}
    verified = {k: 0 for k in keys}
    for r in reqs:
        k = month_key(r["created_at"])
        if k in submitted:
            submitted[k] += 1
        if r.get("verified_at") and month_key(r["verified_at"]) in verified:
            verified[month_key(r["verified_at"])] += 1
    return [{"month": k, "submitted": submitted[k], "verified": verified[k]} for k in keys]


def material_totals(reqs, verified_only=True):
    """Sums verified material (if admin entered it) else nothing; estimated sums kept separately."""
    est, ver = {}, {}
    for r in reqs:
        if r["status"] not in ("verified", "completed"):
            continue
        for m in r.get("estimated_materials", []):
            est[m["material"]] = est.get(m["material"], 0) + m.get("estimated_recoverable_mg", 0)
        for k, v in (r.get("verified_materials_mg") or {}).items():
            ver[k] = ver.get(k, 0) + v
    return ([{"material": k, "mg": round(v, 2)} for k, v in sorted(est.items(), key=lambda x: -x[1])],
            [{"material": k, "mg": round(v, 2)} for k, v in sorted(ver.items(), key=lambda x: -x[1])])


class SummaryView(APIView):
    def get(self, request):
        uid = request.user.oid
        cfg = get_settings()
        reqs = recycling_requests.find({"user_id": uid})
        done = [r for r in reqs if r["status"] in ("verified", "completed")]
        kg = sum((r.get("verified_weight_g") or r.get("weight_g") or 0) for r in done) / 1000
        est, ver = material_totals(reqs)
        recent = sorted(reqs, key=lambda r: r["created_at"], reverse=True)[:5]
        return Response({
            "user": serialize(request.user.doc),
            "counts": {"devices_registered": devices.count({"user_id": uid}), "devices_recycled": len(done),
                       "requests": len(reqs), "active_requests": sum(1 for r in reqs if r["status"] in ("submitted", "under_review", "approved", "collected"))},
            "points": {**get_balance(uid), "pending": pending_points(uid)},
            "level": level_for(len(done)),
            "environment": {"weight_recycled_kg": round(kg, 3), "landfill_diverted_kg": round(kg * cfg["landfill_diverted_share"], 3),
                            "co2e_avoided_kg": round(kg * cfg["co2e_kg_avoided_per_kg_recycled"], 3),
                            "note": "Based on verified requests; factors are configurable estimates."},
            "materials": {"estimated_recoverable": est, "verified_recovered": ver},
            "recent_requests": enrich(recent),
            "recent_transactions": serialize(reward_transactions.find({"user_id": uid}, sort=[("created_at", -1)], limit=5)),
            "notifications": serialize(notifications.find({"user_id": uid}, sort=[("created_at", -1)], limit=5)),
            "unread_notifications": notifications.count({"user_id": uid, "is_read": False}),
            "badges": serialize(user_achievements.find({"user_id": uid}, sort=[("earned_at", -1)])),
        })


class ActivityView(APIView):
    def get(self, request):
        reqs = recycling_requests.find({"user_id": request.user.oid})
        return Response({"monthly": monthly_series(reqs)})


class NotificationsView(APIView):
    def get(self, request):
        flt = {"user_id": request.user.oid}
        if request.query_params.get("unread") == "true":
            flt["is_read"] = False
        data = notifications.paginate(request, flt, sort=[("created_at", -1)], default_size=20)
        data["unread"] = notifications.count({"user_id": request.user.oid, "is_read": False})
        return Response(data)

    def post(self, request):
        """POST {id} marks one read; POST {} marks all read."""
        flt = {"user_id": request.user.oid}
        nid = request.data.get("id")
        if nid:
            from database.repository import to_oid
            flt["_id"] = to_oid(nid)
        notifications.col.update_many(flt, {"$set": {"is_read": True}})
        return Response({"unread": notifications.count({"user_id": request.user.oid, "is_read": False})})


class PublicStatsView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        cfg = get_settings()
        done = recycling_requests.find({"status": {"$in": ["verified", "completed"]}})
        kg = sum((r.get("verified_weight_g") or r.get("weight_g") or 0) for r in done) / 1000
        fac = facilities.find({"is_active": {"$ne": False}})
        return Response({
            "users": users.count({"is_verified": True, "role": "user"}), "devices_recycled": len(done),
            "facilities": len(fac), "facilities_are_sample": any(f.get("is_sample") for f in fac),
            "kg_recycled": round(kg, 2), "co2e_avoided_kg": round(kg * cfg["co2e_kg_avoided_per_kg_recycled"], 2),
        })
