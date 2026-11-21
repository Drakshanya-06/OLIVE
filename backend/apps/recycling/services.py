import base64
import io
import secrets
import string

import qrcode
from pymongo.errors import DuplicateKeyError

from apps.learning.services import bump_challenges
from apps.rewards.services import ledger_add
from database.repositories import devices, facilities, recycling_requests, users
from database.repository import serialize, utcnow
from utils.errors import ApiError
from utils.platform import get_settings, notify

ALPHABET = string.ascii_uppercase.replace("O", "").replace("I", "") + "23456789"

TRANSITIONS = {
    "submitted": ["under_review", "approved", "rejected"],
    "under_review": ["approved", "rejected"],
    "approved": ["collected", "rejected"],
    "collected": ["rejected"],          # collected -> verified goes through the verify endpoint (credits points)
    "verified": ["completed"],
    "completed": [], "rejected": [], "cancelled": [],
}
ACTIVE = ["submitted", "under_review", "approved", "collected"]


def new_code():
    year = utcnow().year
    return f"OLV-{year}-" + "".join(secrets.choice(ALPHABET) for _ in range(6))


def create_request(doc):
    for _ in range(5):
        try:
            return recycling_requests.create({**doc, "request_code": new_code(), "qr_token": secrets.token_urlsafe(24)})
        except DuplicateKeyError:
            continue
    raise ApiError("Could not generate a unique request ID. Try again.", 500, "code_generation_failed")


def qr_payload(req):
    return f"OLIVE:{req['request_code']}:{req['qr_token']}"


def qr_png_base64(req):
    img = qrcode.make(qr_payload(req), box_size=8, border=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def history_entry(status, by, note=""):
    return {"status": status, "at": utcnow(), "by": by, "note": note}


def enrich(reqs, with_user=False):
    """Attach facility name, device summary (and user info for admins) to a list of request docs."""
    f_ids = list({r["facility_id"] for r in reqs})
    d_ids = list({r["device_id"] for r in reqs})
    fmap = {f["_id"]: f for f in facilities.find({"_id": {"$in": f_ids}})}
    dmap = {d["_id"]: d for d in devices.find({"_id": {"$in": d_ids}})}
    umap = {}
    if with_user:
        umap = {u["_id"]: u for u in users.find({"_id": {"$in": list({r["user_id"] for r in reqs})}})}
    out = []
    for r in reqs:
        o = serialize(r)
        f, d = fmap.get(r["facility_id"]), dmap.get(r["device_id"])
        o["facility"] = {"id": str(f["_id"]), "name": f["name"], "city": f.get("city"), "address": f.get("address"),
                         "phone": f.get("phone")} if f else None
        o["device"] = {"id": str(d["_id"]), "category": d["category"], "brand": d.get("brand"), "model": d.get("model"),
                       "condition": d.get("condition"), "photo_url": d.get("photo_url")} if d else None
        if with_user:
            u = umap.get(r["user_id"])
            o["user"] = {"id": str(u["_id"]), "name": u.get("name"), "email": u.get("email"), "phone": u.get("phone")} if u else None
        out.append(o)
    return out


def verify_and_credit(req, admin, final_points=None, verified_weight_g=None, verified_materials_mg=None, note=""):
    """
    Atomic verification. The find_one_and_update on `reward_credited != True` guarantees only ONE caller
    can ever pass, and the unique index on reward_transactions is a second safety net.
    """
    cfg = get_settings()
    points = req.get("estimated_points", 0) if final_points is None else int(final_points)
    points = max(0, min(points, cfg["max_points_per_request"]))
    now = utcnow()
    set_fields = {"reward_credited": True, "status": "verified", "final_points": points, "verified_at": now,
                  "verified_by": admin.oid, "updated_at": now}
    if verified_weight_g is not None:
        set_fields["verified_weight_g"] = verified_weight_g
    if verified_materials_mg is not None:
        set_fields["verified_materials_mg"] = verified_materials_mg
    pushes = []
    if req["status"] == "approved":
        pushes.append(history_entry("collected", admin.email, "Collected at verification"))
    pushes.append(history_entry("verified", admin.email, note or "Verified by administrator"))
    claimed = recycling_requests.col.find_one_and_update(
        {"_id": req["_id"], "reward_credited": {"$ne": True}, "status": {"$in": ["approved", "collected"]}},
        {"$set": set_fields, "$push": {"status_history": {"$each": pushes}}}, return_document=True)
    if not claimed:
        raise ApiError("This request was already verified or is not ready for verification.", 409, "duplicate_reward")
    try:
        ledger_add(req["user_id"], points, "earn", f"Verified recycling {req['request_code']}", request_oid=req["_id"],
                   status="completed")
    except ApiError:
        raise
    except Exception:
        recycling_requests.col.update_one({"_id": req["_id"]}, {"$set": {"reward_credited": False, "status": req["status"]}})
        raise
    devices.update(req["device_id"], {"status": "recycled"})
    notify(req["user_id"], "verification", "Recycling verified", f"{req['request_code']} was verified.", "/recycling")
    notify(req["user_id"], "reward", "Reward credited", f"+{points} points added for {req['request_code']}.", "/rewards")
    bump_challenges(req["user_id"], "recycle_devices", 1)
    return claimed
