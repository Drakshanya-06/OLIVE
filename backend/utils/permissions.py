from rest_framework.permissions import BasePermission


class IsUser(BasePermission):
    message = "Sign in to continue."

    def has_permission(self, request, view):
        return bool(getattr(request, "user", None) and request.user.is_authenticated)


class IsAdmin(BasePermission):
    message = "Administrator access required."

    def has_permission(self, request, view):
        u = getattr(request, "user", None)
        return bool(u and u.is_authenticated and u.is_admin)


class IsSuperAdmin(BasePermission):
    message = "Super administrator access required."

    def has_permission(self, request, view):
        u = getattr(request, "user", None)
        return bool(u and u.is_authenticated and u.is_super_admin)
