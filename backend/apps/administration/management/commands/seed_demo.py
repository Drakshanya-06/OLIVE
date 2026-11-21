"""
Loads CLEARLY-LABELLED SAMPLE data so the app is usable on day one.
 - Facilities are fictional demo records (is_sample=true, status 'sample'). Replace with verified real data via the admin portal.
 - Material figures are academic PLACEHOLDERS (is_placeholder=true), not verified scientific values.
Idempotent: safe to run many times.
"""
from datetime import timedelta
import calendar

from django.core.management.base import BaseCommand

from database.indexes import setup_database
from database.repositories import achievements, challenges, coupons, device_materials, educational_articles, facilities, quizzes
from database.repository import utcnow
from utils.platform import DEFAULT_SETTINGS, get_settings, save_settings
from .seed_content import ACHIEVEMENTS, ARTICLES, COUPONS, DEVICE_REFERENCE, FACILITIES, QUIZZES
from apps.administration.views import norm, slugify

PLACEHOLDER = "Academic placeholder estimate - replace with cited data (published composition studies or recycler reports)."


class Command(BaseCommand):
    help = "Seed sample facilities, device reference data, learning content, achievements and coupons."

    def handle(self, *args, **opts):
        setup_database()
        if not get_settings():
            save_settings(DEFAULT_SETTINGS)
        for f in FACILITIES:
            facilities.col.update_one({"name": f["name"]}, {"$set": {**f, "is_sample": True, "verification_status": "sample", "is_active": True,
                                                                     "data_source": "Academic sample record - not a real facility", "operating_status": "operational"},
                                                            "$setOnInsert": {"rating_avg": 0, "rating_count": 0, "created_at": utcnow()}}, upsert=True)
        for cat, weight, mats, brand, model in DEVICE_REFERENCE:
            default = brand is None
            key = {"category": cat, "brand_key": "" if default else norm(brand), "model_key": "" if default else norm(model)}
            device_materials.col.update_one(key, {"$set": {"category": cat, "brand": "Category average" if default else brand, "model": "default" if default else model,
                                                           "is_category_default": default, "weight_g": weight, "materials_mg": mats,
                                                           "data_source": PLACEHOLDER, "is_placeholder": True, "is_active": True},
                                                  "$setOnInsert": {"created_at": utcnow()}}, upsert=True)
        for a in ACHIEVEMENTS:
            achievements.col.update_one({"key": a["key"]}, {"$set": {**a, "active": True}, "$setOnInsert": {"created_at": utcnow()}}, upsert=True)
        for a in ARTICLES:
            educational_articles.col.update_one({"slug": slugify(a["title"])}, {"$set": {**a, "slug": slugify(a["title"]), "published": True},
                                                                                "$setOnInsert": {"created_at": utcnow()}}, upsert=True)
        for q in QUIZZES:
            quizzes.col.update_one({"slug": slugify(q["title"])}, {"$set": {**q, "slug": slugify(q["title"]), "published": True, "pass_mark": 70},
                                                                   "$setOnInsert": {"created_at": utcnow()}}, upsert=True)
        for c in COUPONS:
            coupons.col.update_one({"code": c["code"]}, {"$set": {**c, "is_sample": True, "active": True}, "$setOnInsert": {"redeemed_count": 0, "created_at": utcnow()}}, upsert=True)
        now = utcnow()
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now.replace(day=calendar.monthrange(now.year, now.month)[1], hour=23, minute=59, second=59, microsecond=0)
        for title, desc, ctype, target, bonus in [
            ("Recycle one device this month", "Get one device verified by a facility.", "recycle_devices", 1, 25),
            ("Pass two quizzes", "Pass any two quizzes in the Learning hub.", "quiz_passed", 2, 20),
            ("Read three articles", "Open and read three awareness articles.", "read_articles", 3, 10)]:
            challenges.col.update_one({"title": title}, {"$set": {"description": desc, "type": ctype, "target": target, "bonus_points": bonus,
                                                                  "start_date": start, "end_date": end, "active": True},
                                                         "$setOnInsert": {"created_at": utcnow()}}, upsert=True)
        self.stdout.write(self.style.SUCCESS("Sample data loaded. Facilities and material figures are SAMPLE/PLACEHOLDER data."))
