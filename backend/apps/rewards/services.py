"""Reward ledger. Every balance change goes through here so the ledger and balance never diverge."""
import uuid

from pymongo.errors import DuplicateKeyError

from database.repositories import reward_balances, reward_transactions
from database.repository import utcnow
from utils.errors import ApiError


def new_txn_id():
    return "TXN-" + uuid.uuid4().hex[:12].upper()


def ledger_add(user_oid, points, kind, description, request_oid=None, challenge_oid=None, status="completed", **extra):
    """
    Insert ledger row FIRST (unique indexes block duplicate 'earn'/'bonus'), then adjust balance.
    kind: earn | bonus | redeem | adjustment.  points is signed (negative for redeem).
    """
    tx = {"transaction_id": new_txn_id(), "user_id": user_oid, "type": kind, "points": int(points),
          "description": description, "status": status, **extra}
    if request_oid:
        tx["recycling_request_id"] = request_oid
    if challenge_oid:
        tx["challenge_id"] = challenge_oid
    try:
        tx = reward_transactions.create(tx)
    except DuplicateKeyError:
        raise ApiError("This reward has already been credited.", 409, "duplicate_reward")
    inc = {"available": int(points)}
    if points > 0:
        inc["total_earned"] = int(points)
    if kind == "redeem":
        inc["redeemed"] = -int(points)
    reward_balances.col.update_one({"user_id": user_oid}, {"$inc": inc, "$set": {"updated_at": utcnow()},
                                                           "$setOnInsert": {"created_at": utcnow()}}, upsert=True)
    return tx


def get_balance(user_oid):
    b = reward_balances.find_one({"user_id": user_oid}) or {}
    return {"available": b.get("available", 0), "total_earned": b.get("total_earned", 0), "redeemed": b.get("redeemed", 0)}
