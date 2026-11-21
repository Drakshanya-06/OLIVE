"""
End-to-end API tests (run with an in-memory MongoDB):
    set MONGO_USE_MOCK=true   (PowerShell: $env:MONGO_USE_MOCK="true")
    python manage.py test tests
"""
import os
import re
from datetime import timedelta

os.environ["MONGO_USE_MOCK"] = "true"

from django.core import mail
from django.core.management import call_command
from django.test import override_settings
from rest_framework.test import APISimpleTestCase, APIClient

from database.connection import get_db
from database.repositories import recycling_requests, reward_transactions, users
from database.repository import utcnow
from utils.security import hash_password


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class OliveFlowTests(APISimpleTestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        db = get_db()
        for n in db.list_collection_names():
            db.drop_collection(n)
        call_command("seed_demo", verbosity=0)
        self.c = APIClient()
        users.create({"name": "Admin", "email": "admin@test.dev", "phone": "9999999999", "role": "super_admin", "is_verified": True,
                      "is_active": True, "password_hash": hash_password("Admin1234")})

    # ---------- helpers
    def register_and_login(self, email="eco@test.dev"):
        r = self.c.post("/api/auth/register/", {"name": "Eco User", "email": email, "phone": "9876543210",
                                                "password": "Secret123", "confirm_password": "Secret123"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        otp = re.search(r"code is (\d{6})", mail.outbox[-1].body).group(1)
        r = self.c.post("/api/auth/verify-otp/", {"email": email, "otp": otp}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()["tokens"]["access"]

    def auth(self, token):
        self.c.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def admin_token(self):
        c = APIClient()
        r = c.post("/api/auth/admin/login/", {"email": "admin@test.dev", "password": "Admin1234"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        data = r.json()
        if data.get("require_otp"):
            r2 = c.post("/api/auth/admin/login/", {"email": "admin@test.dev", "password": "Admin1234", "otp": data["dev_otp"]}, format="json")
            self.assertEqual(r2.status_code, 200, r2.content)
            return r2.json()["tokens"]["access"]
        return data["tokens"]["access"]

    def make_request(self, token):
        self.auth(token)
        a = self.c.post("/api/devices/analyze/", {"category": "smartphone", "brand": "Sample", "model": "Demo Phone X1", "condition": "working"}, format="json")
        self.assertEqual(a.status_code, 201, a.content)
        fac = self.c.get("/api/facilities/?accepts=smartphone&city=Ludhiana").json()["results"][0]
        date = (utcnow() + timedelta(days=3)).strftime("%Y-%m-%d")
        r = self.c.post("/api/recycling/requests/", {"device_id": a.json()["device"]["id"], "facility_id": fac["id"], "method": "drop_off",
                                                     "preferred_date": date}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        return r.json(), a.json()["analysis"]

    # ---------- auth
    def test_registration_otp_rules(self):
        self.c.post("/api/auth/register/", {"name": "A B", "email": "x@test.dev", "phone": "9876543210", "password": "Secret123", "confirm_password": "Secret123"}, format="json")
        bad = self.c.post("/api/auth/verify-otp/", {"email": "x@test.dev", "otp": "000000"}, format="json")
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(bad.json()["error"]["code"], "otp_invalid")
        login = self.c.post("/api/auth/login/", {"email": "x@test.dev", "password": "Secret123"}, format="json")
        self.assertEqual(login.status_code, 403)  # not verified yet

    def test_expired_otp_rejected(self):
        from database.repositories import otp_verifications
        self.c.post("/api/auth/register/", {"name": "A B", "email": "y@test.dev", "phone": "9876543210", "password": "Secret123", "confirm_password": "Secret123"}, format="json")
        otp = re.search(r"code is (\d{6})", mail.outbox[-1].body).group(1)
        otp_verifications.col.update_many({}, {"$set": {"expires_at": utcnow() - timedelta(minutes=1)}})
        r = self.c.post("/api/auth/verify-otp/", {"email": "y@test.dev", "otp": otp}, format="json")
        self.assertIn(r.json()["error"]["code"], ("otp_expired", "otp_missing"))  # Mongo TTL may already have removed it
        self.assertEqual(r.status_code, 400)

    def test_login_refresh_logout_and_protection(self):
        self.assertEqual(self.c.get("/api/dashboard/summary/").status_code, 401)
        self.register_and_login()
        r = self.c.post("/api/auth/login/", {"email": "eco@test.dev", "password": "Secret123"}, format="json")
        t = r.json()["tokens"]
        r2 = self.c.post("/api/auth/refresh/", {"refresh": t["refresh"]}, format="json")
        self.assertEqual(r2.status_code, 200)
        reuse = self.c.post("/api/auth/refresh/", {"refresh": t["refresh"]}, format="json")  # rotated -> must fail
        self.assertEqual(reuse.status_code, 401)
        wrong = self.c.post("/api/auth/login/", {"email": "eco@test.dev", "password": "nope"}, format="json")
        self.assertEqual(wrong.status_code, 401)

    def test_password_reset(self):
        self.register_and_login()
        self.c.post("/api/auth/forgot-password/", {"email": "eco@test.dev"}, format="json")
        otp = re.search(r"code is (\d{6})", mail.outbox[-1].body).group(1)
        r = self.c.post("/api/auth/reset-password/", {"email": "eco@test.dev", "otp": otp, "new_password": "Newpass123", "confirm_password": "Newpass123"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.c.post("/api/auth/login/", {"email": "eco@test.dev", "password": "Newpass123"}, format="json").status_code, 200)

    def test_admin_endpoints_blocked_for_users(self):
        tok = self.register_and_login()
        self.auth(tok)
        self.assertEqual(self.c.get("/api/admin/dashboard/").status_code, 403)
        self.assertEqual(self.c.get("/api/admin/users/").status_code, 403)
        self.assertEqual(APIClient().post("/api/auth/admin/login/", {"email": "eco@test.dev", "password": "Secret123"}, format="json").status_code, 401)

    # ---------- facilities & analyzer
    def test_facility_search_and_nearby(self):
        self.assertGreaterEqual(self.c.get("/api/facilities/?q=Ludhiana").json()["count"], 1)
        n = self.c.get("/api/facilities/nearby/?lat=30.90&lng=75.85&radius_km=20").json()
        self.assertTrue(n["results"] and n["results"][0]["distance_km"] < 20)

    def test_analyzer_model_and_category(self):
        a = self.c.post("/api/devices/estimate/", {"category": "smartphone", "brand": "Sample", "model": "Demo Phone X1"}, format="json").json()
        self.assertEqual(a["estimate_type"], "model_specific")
        b = self.c.post("/api/devices/estimate/", {"category": "smartphone", "brand": "Unknown", "model": "Zed"}, format="json").json()
        self.assertEqual(b["estimate_type"], "category_estimate")
        self.assertIsNone(b["levels"]["verified_recovered"])
        self.assertGreater(b["preliminary_points"], 0)
        self.assertEqual(self.c.post("/api/devices/estimate/", {"category": "spaceship"}, format="json").status_code, 400)

    # ---------- the money path
    def test_full_recycling_reward_flow_and_duplicate_protection(self):
        tok = self.register_and_login()
        req, analysis = self.make_request(tok)
        self.assertTrue(req["request_code"].startswith("OLV-"))
        self.assertIn("qr_token", str(recycling_requests.find_one({})))  # stored...
        self.assertNotIn("qr_token", str(req))                          # ...but never exposed
        qr = self.c.get(f"/api/recycling/requests/{req['id']}/qr/").json()
        self.assertTrue(qr["qr_image"].startswith("data:image/png"))
        self.assertEqual(self.c.get("/api/rewards/balance/").json()["available"], 0)   # nothing before verification
        self.assertEqual(self.c.get("/api/rewards/balance/").json()["pending"], analysis["preliminary_points"])

        adm = APIClient()
        adm.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token()}")
        rid = req["id"]
        self.assertEqual(adm.post(f"/api/admin/recycling/{rid}/verify/", {}, format="json").status_code, 409)  # not approved yet
        self.assertEqual(adm.put(f"/api/admin/recycling/{rid}/status/", {"status": "collected"}, format="json").status_code, 409)
        self.assertEqual(adm.put(f"/api/admin/recycling/{rid}/status/", {"status": "approved"}, format="json").status_code, 200)
        raw = recycling_requests.find_one({})
        scan = adm.post("/api/admin/recycling/scan/", {"payload": f"OLIVE:{raw['request_code']}:{raw['qr_token']}"}, format="json")
        self.assertEqual(scan.status_code, 200)
        self.assertTrue(scan.json()["can_verify"])
        self.assertEqual(adm.post("/api/admin/recycling/scan/", {"payload": f"OLIVE:{raw['request_code']}:wrong"}, format="json").status_code, 404)

        v1 = adm.post(f"/api/admin/recycling/{rid}/verify/", {}, format="json")
        self.assertEqual(v1.status_code, 200, v1.content)
        v2 = adm.post(f"/api/admin/recycling/{rid}/verify/", {}, format="json")
        self.assertEqual(v2.status_code, 409)                                       # duplicate credit blocked
        self.assertEqual(reward_transactions.count({"type": "earn"}), 1)
        bal = self.c.get("/api/rewards/balance/").json()
        self.assertEqual(bal["available"], analysis["preliminary_points"])
        self.assertEqual(bal["pending"], 0)

        # redeem: cannot exceed balance, can redeem within it, cannot overspend by repeating
        coupons = self.c.get("/api/rewards/coupons/").json()["results"]
        cheap = sorted(coupons, key=lambda c: c["points_cost"])[0]
        ok = self.c.post("/api/rewards/redeem/", {"coupon_id": cheap["id"]}, format="json")
        self.assertEqual(ok.status_code, 201, ok.content)
        left = self.c.get("/api/rewards/balance/").json()["available"]
        self.assertEqual(left, bal["available"] - cheap["points_cost"])
        for _ in range(5):
            self.c.post("/api/rewards/redeem/", {"coupon_id": cheap["id"]}, format="json")
        self.assertGreaterEqual(self.c.get("/api/rewards/balance/").json()["available"], 0)
        hist = self.c.get("/api/rewards/history/").json()
        self.assertGreaterEqual(hist["count"], 2)

        # review only possible after verification, once
        fid = req["facility"]["id"]
        self.assertEqual(self.c.post(f"/api/facilities/{fid}/reviews/", {"rating": 5, "comment": "Great"}, format="json").status_code, 201)
        self.assertEqual(self.c.post(f"/api/facilities/{fid}/reviews/", {"rating": 4}, format="json").status_code, 403)

        s = self.c.get("/api/dashboard/summary/").json()
        self.assertEqual(s["counts"]["devices_recycled"], 1)
        self.assertEqual(s["level"]["name"], "Eco Explorer")

    def test_users_cannot_touch_each_others_requests_or_rewards(self):
        t1 = self.register_and_login("a@test.dev")
        req, _ = self.make_request(t1)
        self.c.credentials()
        t2 = self.register_and_login("b@test.dev")
        self.auth(t2)
        self.assertEqual(self.c.get(f"/api/recycling/requests/{req['id']}/").status_code, 404)
        self.assertEqual(self.c.post("/api/admin/recycling/x/verify/", {}, format="json").status_code, 403)

    def test_quiz_scoring_server_side(self):
        tok = self.register_and_login()
        self.auth(tok)
        q = self.c.get("/api/learning/quizzes/").json()["results"][0]
        detail = self.c.get(f"/api/learning/quizzes/{q['id']}/").json()
        self.assertNotIn("correct_index", detail["questions"][0])
        r = self.c.post(f"/api/learning/quizzes/{q['id']}/submit/", {"answers": [0] * len(detail["questions"])}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertIn("percent", r.json())

    def test_upload_validation(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        tok = self.register_and_login()
        self.auth(tok)
        fake = SimpleUploadedFile("x.png", b"not an image", content_type="image/png")
        r = self.c.post("/api/devices/analyze/", {"category": "smartphone", "photo": fake}, format="multipart")
        self.assertEqual(r.status_code, 400)
