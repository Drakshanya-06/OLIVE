import os

from django.core.management.base import BaseCommand, CommandError

from database.repositories import users
from utils.security import hash_password
from utils.validators import check_password_strength


class Command(BaseCommand):
    help = "Create (or promote) the Super Admin using SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD from .env"

    def handle(self, *args, **opts):
        email = os.getenv("SUPERADMIN_EMAIL", "").strip().lower()
        password = os.getenv("SUPERADMIN_PASSWORD", "")
        name = os.getenv("SUPERADMIN_NAME", "OLIVE Super Admin")
        if not email or not password:
            raise CommandError("Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in backend/.env first.")
        weak = check_password_strength(password)
        if weak:
            raise CommandError(weak)
        existing = users.find_one({"email": email})
        fields = {"name": name, "role": "super_admin", "is_verified": True, "is_active": True,
                  "password_hash": hash_password(password), "failed_logins": 0, "locked_until": None}
        if existing:
            users.update(existing["_id"], fields)
            self.stdout.write(self.style.SUCCESS(f"Updated existing account {email} to super_admin."))
        else:
            users.create({**fields, "email": email, "phone": "0000000000", "city": "", "pincode": "", "address": "",
                          "theme": "light", "show_on_leaderboard": False})
            self.stdout.write(self.style.SUCCESS(f"Created super admin {email}."))
        self.stdout.write("Sign in at /admin/login. Remove SUPERADMIN_PASSWORD from .env afterwards.")
