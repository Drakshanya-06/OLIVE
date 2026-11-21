import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from django.conf import settings

from .errors import ApiError

_ph = PasswordHasher()


def now():
    return datetime.now(timezone.utc)


def hash_password(password):
    return _ph.hash(password)


def verify_password(stored_hash, password):
    try:
        return _ph.verify(stored_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def generate_otp():
    return f"{secrets.randbelow(10**6):06d}"


def hash_otp(email, otp):
    """HMAC so OTPs are never stored in plain text."""
    return hmac.new(settings.SECRET_KEY.encode(), f"{email}:{otp}".encode(), hashlib.sha256).hexdigest()


def safe_equal(a, b):
    return hmac.compare_digest(str(a), str(b))


def make_token(user_id, role, kind):
    ttl = timedelta(minutes=settings.JWT_ACCESS_MINUTES) if kind == "access" else timedelta(days=settings.JWT_REFRESH_DAYS)
    exp = now() + ttl
    payload = {"sub": str(user_id), "role": role, "type": kind, "jti": uuid.uuid4().hex, "iat": now(), "exp": exp}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256"), payload["jti"], exp


def decode_token(token, kind):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise ApiError("Your session has expired. Please sign in again.", 401, "token_expired")
    except jwt.PyJWTError:
        raise ApiError("Invalid authentication token.", 401, "token_invalid")
    if payload.get("type") != kind:
        raise ApiError("Invalid authentication token.", 401, "token_invalid")
    return payload
