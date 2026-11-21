from django.core.management.base import BaseCommand

from database.indexes import setup_database


class Command(BaseCommand):
    help = "Create MongoDB collections, validators and indexes (safe to run repeatedly)."

    def handle(self, *args, **opts):
        for line in setup_database():
            self.stdout.write(line)
        self.stdout.write(self.style.SUCCESS("Database ready."))
