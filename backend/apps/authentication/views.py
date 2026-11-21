from datetime import timedelta

from bson import ObjectId
from django.conf import settings
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from database.repositories import token_blacklist, users
from database.repository import serialize, utcnow
from utils.errors import ApiError
from utils.platform import audit, notify
from utils.security import decode_token, hash_password, verify_password
from utils.validators import check_password_strength, validate
from .services import check_otp, issue_otp, issue_tokens, revoke_refresh

REGISTER = {
    "name": {"required": True, "min": 2, "max": 80},
    "email": {"type": "email", "required": True},
    "phone": {"type": "phone", "required": True},
    "password": {"required": True, "max": 128},
    "confirm_password": {"required": True, "max": 128},
}


def public_user(doc):
    return serialize(doc)


def should_expose_dev_otp():
    is_smtp = getattr(settings, "EMAIL_BACKEND", "") == "django.core.mail.backends.smtp.EmailBackend"
    return (not is_smtp) and (settings.DEBUG or getattr(settings, "MONGO_USE_MOCK", False))


class NoAuth(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]


class RegisterView(NoAuth):
    throttle_scope = "auth"

    def post(self, request):
        d = validate(request.data, REGISTER)
        if d["password"] != d["confirm_password"]:
            raise ApiError("Passwords do not match.", 400, "validation_error", {"confirm_password": "Passwords do not match."})
        weak = check_password_strength(d["password"])
        if weak:
            raise ApiError(weak, 400, "validation_error", {"password": weak})
        existing = users.find_one({"email": d["email"]})
        if existing and existing.get("is_verified"):
            raise ApiError("An account with this email already exists. Try signing in.", 409, "email_exists",
                           {"email": "Already registered."})
        fields = {"name": d["name"], "phone": d["phone"], "password_hash": hash_password(d["password"])}
        if existing:
            users.update(existing["_id"], fields)
        else:
            users.create({**fields, "email": d["email"], "role": "user", "is_verified": False, "is_active": True,
                          "city": "", "pincode": "", "address": "", "theme": "light", "show_on_leaderboard": True,
                          "failed_logins": 0})
        otp = issue_otp(d["email"], "register")
        resp = {"message": "Account created. We sent a 6-digit code to your email.", "email": d["email"]}
        if should_expose_dev_otp():
            resp["dev_otp"] = otp
        return Response(resp, status=201)


class VerifyOtpView(NoAuth):
    throttle_scope = "otp"

    def post(self, request):
        d = validate(request.data, {"email": {"type": "email", "required": True}, "otp": {"required": True, "min": 6, "max": 6}})
        user = users.find_one({"email": d["email"]})
        if not user:
            raise ApiError("No active code. Request a new one.", 400, "otp_missing")
        check_otp(d["email"], "register", d["otp"])
        user = users.update(user["_id"], {"is_verified": True})
        notify(user["_id"], "welcome", "Welcome to OLIVE", "Your email is verified. Analyze a device to start earning rewards.", "/device-analyzer")
        return Response({"message": "Email verified.", "user": public_user(user), "tokens": issue_tokens(user)})


class ResendOtpView(NoAuth):
    throttle_scope = "otp"

    def post(self, request):
        d = validate(request.data, {"email": {"type": "email", "required": True}, "purpose": {"choices": ["register", "reset", "admin_login"], "default": "register"}})
        user = users.find_one({"email": d["email"]})
        purpose = d.get("purpose", "register")
        otp = None
        if user:
            can_issue = (
                (purpose == "register" and not user.get("is_verified")) or
                (purpose == "reset" and user.get("is_verified")) or
                (purpose == "admin_login" and user.get("is_verified") and user.get("role") in ("admin", "super_admin"))
            )
            if can_issue:
                otp = issue_otp(d["email"], purpose)
        resp = {"message": "If the account exists, a new code has been sent."}
        if should_expose_dev_otp() and otp:
            resp["dev_otp"] = otp
        return Response(resp)


def _login(request, admin_only=False):
    d = validate(request.data, {"email": {"type": "email", "required": True}, "password": {"required": True, "max": 128}})
    generic = ApiError("Incorrect email or password.", 401, "invalid_credentials")
    user = users.find_one({"email": d["email"]})
    if not user:
        raise generic
    locked = user.get("locked_until")
    if locked and locked > utcnow():
        raise ApiError("Too many failed attempts. Try again in a few minutes.", 429, "account_locked")
    if not verify_password(user["password_hash"], d["password"]):
        fails = user.get("failed_logins", 0) + 1
        upd = {"failed_logins": fails}
        if fails >= settings.LOGIN_MAX_FAILURES:
            upd = {"failed_logins": 0, "locked_until": utcnow() + timedelta(minutes=settings.LOGIN_LOCK_MINUTES)}
        users.col.update_one({"_id": user["_id"]}, {"$set": upd})
        raise generic
    if admin_only and user["role"] not in ("admin", "super_admin"):
        raise generic  # do not reveal that the account exists but is not an admin
    if not user.get("is_active", True):
        raise ApiError("This account has been deactivated. Contact support.", 403, "account_disabled")
    if not user.get("is_verified"):
        raise ApiError("Verify your email first.", 403, "email_not_verified", {"email": user["email"]})
    users.col.update_one({"_id": user["_id"]}, {"$set": {"failed_logins": 0, "locked_until": None, "last_login": utcnow()}})
    return user


class LoginView(NoAuth):
    throttle_scope = "auth"

    def post(self, request):
        user = _login(request)
        return Response({"user": public_user(user), "tokens": issue_tokens(user)})


class AdminLoginView(NoAuth):
    throttle_scope = "auth"

    def post(self, request):
        user = _login(request, admin_only=True)
        otp = request.data.get("otp")
        if not otp:
            admin_otp = issue_otp(user["email"], "admin_login")
            resp = {
                "require_otp": True,
                "email": user["email"],
                "message": "Enter the 6-digit verification code sent to your admin email.",
            }
            if should_expose_dev_otp():
                resp["dev_otp"] = admin_otp
            return Response(resp, status=200)

        # Verify OTP
        check_otp(user["email"], "admin_login", str(otp).strip())
        return Response({"user": public_user(user), "tokens": issue_tokens(user)})


class RefreshView(NoAuth):
    throttle_scope = "auth"

    def post(self, request):
        token = request.data.get("refresh") if hasattr(request.data, "get") else None
        if not token:
            raise ApiError("Refresh token required.", 400, "validation_error")
        payload = decode_token(token, "refresh")
        if token_blacklist.find_one({"jti": payload["jti"]}):
            raise ApiError("Session expired. Please sign in again.", 401, "token_revoked")
        user = users.find_one({"_id": ObjectId(payload["sub"])})
        if not user or not user.get("is_active", True) or not user.get("is_verified"):
            raise ApiError("Account is not available.", 401, "account_unavailable")
        revoke_refresh(token)  # rotation: each refresh token works once
        return Response({"tokens": issue_tokens(user)})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get("refresh") if hasattr(request.data, "get") else None
        if token:
            revoke_refresh(token)
        return Response({"message": "Signed out."})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"user": public_user(request.user.doc)})


class ForgotPasswordView(NoAuth):
    throttle_scope = "otp"

    def post(self, request):
        d = validate(request.data, {"email": {"type": "email", "required": True}})
        user = users.find_one({"email": d["email"]})
        if user and user.get("is_verified") and user.get("is_active", True):
            try:
                issue_otp(d["email"], "reset")
            except ApiError as exc:
                if exc.code != "otp_cooldown":
                    raise
        # Same answer either way so attackers cannot discover which emails are registered.
        return Response({"message": "If that email is registered, we sent a reset code."})


class ResetPasswordView(NoAuth):
    throttle_scope = "otp"

    def post(self, request):
        d = validate(request.data, {"email": {"type": "email", "required": True}, "otp": {"required": True, "min": 6, "max": 6},
                                    "new_password": {"required": True, "max": 128}, "confirm_password": {"required": True, "max": 128}})
        if d["new_password"] != d["confirm_password"]:
            raise ApiError("Passwords do not match.", 400, "validation_error", {"confirm_password": "Passwords do not match."})
        weak = check_password_strength(d["new_password"])
        if weak:
            raise ApiError(weak, 400, "validation_error", {"new_password": weak})
        user = users.find_one({"email": d["email"]})
        if not user:
            raise ApiError("No active code. Request a new one.", 400, "otp_missing")
        check_otp(d["email"], "reset", d["otp"])
        users.update(user["_id"], {"password_hash": hash_password(d["new_password"]), "failed_logins": 0, "locked_until": None})
        notify(user["_id"], "security", "Password changed", "Your password was reset successfully.")
        return Response({"message": "Password updated. You can now sign in."})
