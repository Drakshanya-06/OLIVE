from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail

from database.repositories import otp_verifications, token_blacklist
from database.repository import utcnow
from utils.errors import ApiError
from utils.security import generate_otp, hash_otp, make_token, safe_equal, decode_token


def issue_otp(email, purpose):
    """Create + email a 6-digit OTP. Stores only an HMAC hash. Enforces resend cooldown."""
    last = otp_verifications.find_one({"email": email, "purpose": purpose})
    now = utcnow()
    if last and (now - last["created_at"]).total_seconds() < settings.OTP_RESEND_COOLDOWN_SECONDS:
        raise ApiError("Please wait a minute before requesting another code.", 429, "otp_cooldown")
    otp_verifications.col.delete_many({"email": email, "purpose": purpose})
    otp = generate_otp()
    otp_verifications.create({
        "email": email, "purpose": purpose, "otp_hash": hash_otp(email, otp), "attempts": 0,
        "expires_at": now + timedelta(minutes=settings.OTP_TTL_MINUTES),
    })
    if purpose == "register":
        subject = "Verify your OLIVE account"
        body = (f"Your OLIVE verification code is {otp}.\n\nIt expires in {settings.OTP_TTL_MINUTES} minutes. "
                "If you did not request this, you can ignore this email.")
    elif purpose == "admin_login":
        subject = "OLIVE Admin Sign In Code"
        body = (f"Your OLIVE admin 2-step verification code is {otp}.\n\nIt expires in {settings.OTP_TTL_MINUTES} minutes. "
                "If you did not attempt to sign in to the Admin Portal, please secure your account immediately.")
    else:
        subject = "Reset your OLIVE password"
        body = (f"Your OLIVE password reset code is {otp}.\n\nIt expires in {settings.OTP_TTL_MINUTES} minutes. "
                "If you did not request this, you can ignore this email.")
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=False)
    except Exception:
        otp_verifications.col.delete_many({"email": email, "purpose": purpose})
        raise ApiError("We could not send the email. Check the email settings and try again.", 502, "email_failed")
    return otp


def check_otp(email, purpose, otp):
    """Validates and consumes an OTP. Raises ApiError for expired / wrong / too many attempts."""
    doc = otp_verifications.find_one({"email": email, "purpose": purpose})
    if not doc:
        raise ApiError("No active code. Request a new one.", 400, "otp_missing")
    if doc["expires_at"] <= utcnow():
        otp_verifications.col.delete_one({"_id": doc["_id"]})
        raise ApiError("This code has expired. Request a new one.", 400, "otp_expired")
    if doc["attempts"] >= settings.OTP_MAX_ATTEMPTS:
        otp_verifications.col.delete_one({"_id": doc["_id"]})
        raise ApiError("Too many wrong attempts. Request a new code.", 429, "otp_locked")
    if not safe_equal(doc["otp_hash"], hash_otp(email, str(otp).strip())):
        otp_verifications.col.update_one({"_id": doc["_id"]}, {"$inc": {"attempts": 1}})
        left = settings.OTP_MAX_ATTEMPTS - doc["attempts"] - 1
        raise ApiError(f"Incorrect code. {max(left, 0)} attempt(s) left.", 400, "otp_invalid")
    otp_verifications.col.delete_one({"_id": doc["_id"]})


def issue_tokens(user):
    access, _, a_exp = make_token(user["_id"], user["role"], "access")
    refresh, _, _ = make_token(user["_id"], user["role"], "refresh")
    return {"access": access, "refresh": refresh, "expires_at": a_exp.isoformat()}


def revoke_refresh(token):
    try:
        payload = decode_token(token, "refresh")
    except ApiError:
        return None
    from datetime import datetime, timezone
    token_blacklist.col.update_one(
        {"jti": payload["jti"]},
        {"$setOnInsert": {"jti": payload["jti"], "expires_at": datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
                          "created_at": utcnow()}}, upsert=True)
    return payload
