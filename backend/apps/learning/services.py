"""Achievements, levels and challenge progress (called by recycling/learning flows)."""
from pymongo.errors import DuplicateKeyError

from apps.rewards.services import ledger_add
from database.repositories import (achievements, article_reads, challenge_participants, challenges,
                                   quiz_attempts, recycling_requests, user_achievements)
from database.repository import utcnow
from utils.platform import notify

LEVELS = [
    {"name": "Green Beginner", "min": 0},
    {"name": "Eco Explorer", "min": 1},
    {"name": "Responsible Recycler", "min": 3},
    {"name": "Green Champion", "min": 7},
    {"name": "Earth Guardian", "min": 15},
]


def verified_count(user_oid):
    return recycling_requests.count({"user_id": user_oid, "status": {"$in": ["verified", "completed"]}})


def level_for(count):
    cur = LEVELS[0]
    for lv in LEVELS:
        if count >= lv["min"]:
            cur = lv
    nxt = next((lv for lv in LEVELS if lv["min"] > count), None)
    return {"name": cur["name"], "recycled": count, "next_name": nxt["name"] if nxt else None,
            "next_at": nxt["min"] if nxt else None}


def evaluate_achievements(user_oid):
    stats = {
        "verified_recycles": verified_count(user_oid),
        "quizzes_passed": len({a["quiz_id"] for a in quiz_attempts.find({"user_id": user_oid, "passed": True})}),
        "articles_read": article_reads.count({"user_id": user_oid}),
        "challenges_completed": challenge_participants.count({"user_id": user_oid, "completed": True}),
    }
    for ach in achievements.find({"active": {"$ne": False}}):
        if stats.get(ach.get("criteria"), 0) >= ach.get("threshold", 1):
            try:
                user_achievements.create({"user_id": user_oid, "achievement_key": ach["key"], "earned_at": utcnow()})
            except DuplicateKeyError:
                continue
            notify(user_oid, "achievement", f"Achievement unlocked: {ach['title']}", ach.get("description", ""), "/learning")


def bump_challenges(user_oid, ctype, inc=1):
    now = utcnow()
    for ch in challenges.find({"type": ctype, "active": {"$ne": False}, "start_date": {"$lte": now}, "end_date": {"$gte": now}}):
        part = challenge_participants.col.find_one_and_update(
            {"challenge_id": ch["_id"], "user_id": user_oid, "completed": False},
            {"$inc": {"progress": inc}, "$set": {"updated_at": now}}, return_document=True)
        if not part or part["progress"] < ch["target"]:
            continue
        claimed = challenge_participants.col.find_one_and_update(
            {"_id": part["_id"], "completed": False}, {"$set": {"completed": True, "completed_at": now}})
        if not claimed:
            continue
        bonus = int(ch.get("bonus_points", 0))
        if bonus > 0:
            try:
                ledger_add(user_oid, bonus, "bonus", f"Challenge completed: {ch['title']}", challenge_oid=ch["_id"])
            except Exception:
                pass
        notify(user_oid, "challenge", "Challenge completed", f"You completed “{ch['title']}”." + (f" +{bonus} points." if bonus else ""), "/learning")
    evaluate_achievements(user_oid)
