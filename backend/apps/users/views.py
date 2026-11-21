from rest_framework.response import Response
from rest_framework.views import APIView

from database.repositories import users
from database.repository import serialize
from utils.errors import ApiError
from utils.platform import notify
from utils.security import hash_password, verify_password
from utils.validators import check_password_strength, validate

PROFILE = {
    "name": {"min": 2, "max": 80},
    "phone": {"type": "phone"},
    "city": {"max": 80},
    "pincode": {"type": "pin"},
    "address": {"max": 300},
    "theme": {"choices": ["light", "dark"]},
    "show_on_leaderboard": {"type": "bool"},
}


class ProfileView(APIView):
    def get(self, request):
        return Response({"user": serialize(request.user.doc)})

    def put(self, request):
        d = validate(request.data, PROFILE, partial=True)
        user = users.update(request.user.oid, d)
        return Response({"user": serialize(user)})

    patch = put


class ChangePasswordView(APIView):
    throttle_scope = "auth"

    def put(self, request):
        d = validate(request.data, {"old_password": {"required": True, "max": 128}, "new_password": {"required": True, "max": 128},
                                    "confirm_password": {"required": True, "max": 128}})
        if not verify_password(request.user.doc["password_hash"], d["old_password"]):
            raise ApiError("Current password is incorrect.", 400, "validation_error", {"old_password": "Incorrect password."})
        if d["new_password"] != d["confirm_password"]:
            raise ApiError("Passwords do not match.", 400, "validation_error", {"confirm_password": "Passwords do not match."})
        weak = check_password_strength(d["new_password"])
        if weak:
            raise ApiError(weak, 400, "validation_error", {"new_password": weak})
        users.update(request.user.oid, {"password_hash": hash_password(d["new_password"])})
        notify(request.user.oid, "security", "Password changed", "Your password was changed.")
        return Response({"message": "Password updated."})
