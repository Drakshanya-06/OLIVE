import os
from django.apps import AppConfig


class AdministrationConfig(AppConfig):
    name = "apps.administration"
    label = "administration"

    def ready(self):
        from django.conf import settings
        if getattr(settings, "MONGO_USE_MOCK", False):
            # Only run inside worker or direct runserver (avoid double execution if autoreload parent)
            if os.environ.get("RUN_MAIN") == "true" or "runserver" in os.sys.argv:
                from django.core.management import call_command
                try:
                    call_command("setup_database")
                    call_command("seed_demo")
                    if os.getenv("SUPERADMIN_EMAIL") and os.getenv("SUPERADMIN_PASSWORD"):
                        call_command("create_superadmin")
                except Exception as e:
                    pass

