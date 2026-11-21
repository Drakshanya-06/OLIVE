import secrets
import string

from django.http import HttpResponse
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from database.repositories import (achievements, coupons, recycling_requests, reward_balances, reward_transactions,
                                   user_achievements, users)
from database.repository import serialize, to_oid, utcnow
from utils.errors import ApiError
from utils.platform import get_settings, notify
from apps.learning.services import level_for, verified_count
from .services import get_balance, ledger_add


def pending_points(user_oid):
    reqs = recycling_requests.find({"user_id": user_oid, "status": {"$in": ["submitted", "under_review", "approved", "collected"]}})
    return sum(r.get("estimated_points", 0) for r in reqs)


class BalanceView(APIView):
    def get(self, request):
        b = get_balance(request.user.oid)
        b["pending"] = pending_points(request.user.oid)
        b["level"] = level_for(verified_count(request.user.oid))
        return Response(b)


class HistoryView(APIView):
    def get(self, request):
        flt = {"user_id": request.user.oid}
        if request.query_params.get("type") in ("earn", "redeem", "bonus", "adjustment"):
            flt["type"] = request.query_params["type"]
        return Response(reward_transactions.paginate(request, flt, sort=[("created_at", -1)], default_size=15))


class CouponCatalogView(APIView):
    def get(self, request):
        now = utcnow()
        flt = {"active": {"$ne": False}, "stock": {"$gt": 0}, "$or": [{"expires_at": None}, {"expires_at": {"$gt": now}}, {"expires_at": {"$exists": False}}]}
        return Response({"results": serialize(coupons.find(flt, sort=[("points_cost", 1)]))})


class RedeemView(APIView):
    """
    POST /api/rewards/redeem/ {coupon_id}
    Atomic: balance is debited with a conditional update (available >= cost) so double-clicks / races
    can never overspend, and the coupon stock is decremented with a conditional update as well.
    """

    def post(self, request):
        cid = to_oid(request.data.get("coupon_id"), "coupon")
        coupon = coupons.get(cid, "Coupon")
        if coupon.get("active") is False or (coupon.get("expires_at") and coupon["expires_at"] < utcnow()):
            raise ApiError("This coupon is no longer available.", 400, "coupon_unavailable")
        cost = int(coupon["points_cost"])
        reserved = coupons.col.find_one_and_update({"_id": cid, "active": {"$ne": False}, "stock": {"$gt": 0}},
                                                   {"$inc": {"stock": -1, "redeemed_count": 1}})
        if not reserved:
            raise ApiError("This coupon is out of stock.", 409, "out_of_stock")
        debited = reward_balances.col.find_one_and_update({"user_id": request.user.oid, "available": {"$gte": cost}},
                                                          {"$inc": {"available": -cost, "redeemed": cost}})
        if not debited:
            coupons.col.update_one({"_id": cid}, {"$inc": {"stock": 1, "redeemed_count": -1}})
            raise ApiError("You do not have enough available points.", 400, "insufficient_points")
        code = "OLV-" + "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        # balance already debited above, so write the ledger row directly
        tx = reward_transactions.create({"transaction_id": "TXN-" + secrets.token_hex(6).upper(), "user_id": request.user.oid,
                                         "type": "redeem", "points": -cost, "status": "completed",
                                         "description": f"Redeemed: {coupon['title']}", "coupon_id": cid, "coupon_code": code,
                                         "coupon_title": coupon["title"]})
        notify(request.user.oid, "reward", "Coupon redeemed", f"Your code for {coupon['title']} is {code}.", "/rewards")
        return Response({"message": "Coupon redeemed.", "coupon_code": code, "transaction": serialize(tx),
                         "balance": get_balance(request.user.oid)}, status=201)


class MyCouponsView(APIView):
    def get(self, request):
        docs = reward_transactions.find({"user_id": request.user.oid, "type": "redeem"}, sort=[("created_at", -1)], limit=100)
        return Response({"results": serialize(docs)})


class AchievementsView(APIView):
    def get(self, request):
        earned = {a["achievement_key"]: a["earned_at"] for a in user_achievements.find({"user_id": request.user.oid})}
        out = []
        for a in achievements.find({"active": {"$ne": False}}, sort=[("threshold", 1)]):
            o = serialize(a)
            o["earned"] = a["key"] in earned
            o["earned_at"] = earned[a["key"]].isoformat() if a["key"] in earned else None
            out.append(o)
        return Response({"results": out, "level": level_for(verified_count(request.user.oid))})


class LeaderboardView(APIView):
    """Public, privacy-safe: first name + initial only, users can opt out in settings."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        size = get_settings()["leaderboard_size"]
        counts = {}
        for r in recycling_requests.col.find({"status": {"$in": ["verified", "completed"]}}, {"user_id": 1, "weight_g": 1}):
            c = counts.setdefault(r["user_id"], {"recycled": 0, "kg": 0.0})
            c["recycled"] += 1
            c["kg"] += (r.get("weight_g") or 0) / 1000
        udocs = {u["_id"]: u for u in users.find({"_id": {"$in": list(counts)}})}
        rows = []
        for uid, c in counts.items():
            u = udocs.get(uid)
            if not u or u.get("show_on_leaderboard") is False or not u.get("is_active", True):
                continue
            parts = u.get("name", "Eco Hero").split()
            display = parts[0] + (f" {parts[-1][0]}." if len(parts) > 1 else "")
            rows.append({"name": display, "recycled": c["recycled"], "kg": round(c["kg"], 2), "level": level_for(c["recycled"])["name"]})
        rows.sort(key=lambda r: (-r["recycled"], -r["kg"]))
        for i, r in enumerate(rows[:size], 1):
            r["rank"] = i
        return Response({"results": rows[:size]})
