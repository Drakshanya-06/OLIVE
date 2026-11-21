"""
Collection validators + indexes. Run with:  python manage.py setup_database
Safe to run repeatedly. Validators use MongoDB $jsonSchema (validationLevel=moderate so
older documents never block updates).
"""
import logging

from pymongo import ASCENDING, DESCENDING, TEXT
from pymongo.errors import OperationFailure

from .connection import get_db

log = logging.getLogger(__name__)


def _schema(required, props):
    return {"$jsonSchema": {"bsonType": "object", "required": required, "properties": props}}


S, N, B, D, O = "string", ["int", "long", "double"], "bool", "date", "objectId"

VALIDATORS = {
    "users": _schema(
        ["email", "password_hash", "role", "is_verified", "created_at"],
        {"email": {"bsonType": S}, "password_hash": {"bsonType": S},
         "role": {"enum": ["user", "admin", "super_admin"]}, "is_verified": {"bsonType": B}},
    ),
    "facilities": _schema(
        ["name", "city", "facility_type", "latitude", "longitude", "verification_status"],
        {"name": {"bsonType": S}, "facility_type": {"enum": ["government", "private", "ngo"]},
         "latitude": {"bsonType": N}, "longitude": {"bsonType": N},
         "verification_status": {"enum": ["verified", "pending", "unverified", "sample"]}},
    ),
    "recycling_requests": _schema(
        ["request_code", "user_id", "device_id", "facility_id", "status", "method"],
        {"request_code": {"bsonType": S}, "user_id": {"bsonType": O}, "device_id": {"bsonType": O},
         "facility_id": {"bsonType": O},
         "status": {"enum": ["submitted", "under_review", "approved", "collected", "verified", "completed", "rejected", "cancelled"]},
         "method": {"enum": ["drop_off", "pickup"]}},
    ),
    "reward_transactions": _schema(
        ["transaction_id", "user_id", "type", "points", "status", "created_at"],
        {"transaction_id": {"bsonType": S}, "user_id": {"bsonType": O},
         "type": {"enum": ["earn", "redeem", "bonus", "adjustment"]}, "points": {"bsonType": N}},
    ),
    "reward_balances": _schema(["user_id", "available"], {"user_id": {"bsonType": O}, "available": {"bsonType": N}}),
}

U = {"unique": True}
INDEXES = {
    "users": [([("email", ASCENDING)], U), ([("role", ASCENDING)], {}), ([("created_at", DESCENDING)], {})],
    "facilities": [([("city", ASCENDING)], {}), ([("pincode", ASCENDING)], {}), ([("verification_status", ASCENDING)], {}),
                   ([("name", TEXT), ("city", TEXT), ("address", TEXT)], {"name": "facility_text"})],
    "devices": [([("user_id", ASCENDING), ("created_at", DESCENDING)], {})],
    "device_materials": [([("category", ASCENDING), ("brand_key", ASCENDING), ("model_key", ASCENDING)], U)],
    "recycling_requests": [([("request_code", ASCENDING)], U), ([("qr_token", ASCENDING)], U),
                           ([("user_id", ASCENDING), ("created_at", DESCENDING)], {}),
                           ([("status", ASCENDING)], {}), ([("facility_id", ASCENDING)], {})],
    "reward_transactions": [([("transaction_id", ASCENDING)], U),
                            ([("user_id", ASCENDING), ("created_at", DESCENDING)], {}),
                            # one 'earn' credit per recycling request -> duplicate reward prevention
                            ([("recycling_request_id", ASCENDING)],
                             {"unique": True, "name": "one_earn_per_request",
                              "partialFilterExpression": {"type": "earn", "recycling_request_id": {"$type": "objectId"}}}),
                            ([("user_id", ASCENDING), ("challenge_id", ASCENDING)],
                             {"unique": True, "name": "one_bonus_per_challenge",
                              "partialFilterExpression": {"type": "bonus", "challenge_id": {"$type": "objectId"}}})],
    "reward_balances": [([("user_id", ASCENDING)], U)],
    "coupons": [([("code", ASCENDING)], U)],
    "notifications": [([("user_id", ASCENDING), ("created_at", DESCENDING)], {})],
    "educational_articles": [([("slug", ASCENDING)], U), ([("category", ASCENDING)], {})],
    "quizzes": [([("slug", ASCENDING)], U)],
    "quiz_attempts": [([("user_id", ASCENDING), ("quiz_id", ASCENDING)], {})],
    "challenges": [([("end_date", ASCENDING)], {})],
    "challenge_participants": [([("challenge_id", ASCENDING), ("user_id", ASCENDING)], U)],
    "facility_reviews": [([("request_id", ASCENDING)], U), ([("facility_id", ASCENDING)], {})],
    "achievements": [([("key", ASCENDING)], U)],
    "user_achievements": [([("user_id", ASCENDING), ("achievement_key", ASCENDING)], U)],
    "admin_logs": [([("created_at", DESCENDING)], {})],
    "otp_verifications": [([("expires_at", ASCENDING)], {"expireAfterSeconds": 0}),
                          ([("email", ASCENDING), ("purpose", ASCENDING)], {})],
    "token_blacklist": [([("expires_at", ASCENDING)], {"expireAfterSeconds": 0}), ([("jti", ASCENDING)], U)],
    "system_settings": [([("key", ASCENDING)], U)],
    "article_reads": [([("user_id", ASCENDING), ("article_id", ASCENDING)], U)],
}


def setup_database(apply_validators=True):
    db = get_db()
    existing = set(db.list_collection_names())
    report = []
    for name in INDEXES:
        if name not in existing:
            try:
                db.create_collection(name)
            except Exception as exc:  # pragma: no cover
                log.warning("create_collection %s: %s", name, exc)
    if apply_validators:
        for name, validator in VALIDATORS.items():
            try:
                db.command("collMod", name, validator=validator, validationLevel="moderate")
                report.append(f"validator ok: {name}")
            except Exception as exc:
                report.append(f"validator skipped: {name} ({type(exc).__name__})")
    for name, specs in INDEXES.items():
        for keys, opts in specs:
            try:
                db[name].create_index(keys, **opts)
            except OperationFailure as exc:
                report.append(f"index problem on {name}: {exc}")
            except Exception as exc:
                report.append(f"index skipped on {name}: {type(exc).__name__}")
        report.append(f"indexes ok: {name}")
    return report
