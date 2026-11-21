from bson import ObjectId
from rest_framework.authentication import BaseAuthentication

from database.repositories import users
from .errors import ApiError
from .security import decode_token


class AuthUser:
    """Lightweight request.user for MongoDB-backed accounts."""
    is_authenticated = True

    def __init__(self, doc):
        self.doc = doc
        self.oid = doc["_id"]
        self.id = str(doc["_id"])
        self.pk = self.id  # DRF throttling keys on request.user.pk
        self.email = doc["email"]
        self.name = doc.get("name", "")
        self.role = doc.get("role", "user")

    @property
    def is_admin(self):
        return self.role in ("admin", "super_admin")

    @property
    def is_super_admin(self):
        return self.role == "super_admin"


class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return None
        payload = decode_token(header[7:].strip(), "access")
        try:
            doc = users.col.find_one({"_id": ObjectId(payload["sub"])})
        except Exception:
            doc = None
        if not doc or not doc.get("is_active", True) or not doc.get("is_verified"):
            raise ApiError("Account is not available.", 401, "account_unavailable")
        return AuthUser(doc), payload

    def authenticate_header(self, request):
        return "Bearer"
