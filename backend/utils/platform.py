"""Cross-cutting helpers: configurable settings, notifications, audit log."""
from database.repositories import admin_logs, notifications, system_settings
from database.repository import utcnow

DEFAULT_SETTINGS = {
    # --- Reward formula: points = recoverable value (INR) x points_per_inr, capped ---
    "points_per_inr": 1.0,
    "max_points_per_request": 1000,
    # --- Placeholder market prices (INR per gram). ADMIN MUST UPDATE with current, cited prices. ---
    "material_prices_inr_per_g": {"gold": 7000.0, "silver": 90.0, "copper": 0.85, "palladium": 2500.0,
                                  "aluminium": 0.22, "lithium": 1.0, "cobalt": 3.0},
    # --- Recovery assumptions ---
    "default_recovery_rate": 0.6,
    "condition_multipliers": {"working": 1.0, "damaged": 0.9, "not_working": 0.8},
    # --- Environmental factors (placeholders; replace with cited values) ---
    "co2e_kg_avoided_per_kg_recycled": 1.5,
    "landfill_diverted_share": 1.0,
    "max_pickup_days_ahead": 60,
    "leaderboard_size": 10,
}


def get_settings():
    doc = system_settings.find_one({"key": "platform"}) or {}
    values = doc.get("values", {})
    merged = {**DEFAULT_SETTINGS, **values}
    for k in ("material_prices_inr_per_g", "condition_multipliers"):
        merged[k] = {**DEFAULT_SETTINGS[k], **values.get(k, {})}
    return merged


def save_settings(values):
    system_settings.col.update_one(
        {"key": "platform"}, {"$set": {"values": values, "updated_at": utcnow()}, "$setOnInsert": {"created_at": utcnow()}}, upsert=True
    )


def notify(user_oid, kind, title, message, link=None):
    return notifications.create(
        {"user_id": user_oid, "type": kind, "title": title, "message": message, "link": link, "is_read": False}
    )


def audit(request, action, target_type, target_id=None, detail=None):
    u = request.user
    admin_logs.create({"admin_id": u.oid, "admin_email": u.email, "action": action, "target_type": target_type,
                       "target_id": str(target_id) if target_id else None, "detail": detail or {},
                       "ip": request.META.get("REMOTE_ADDR")})
