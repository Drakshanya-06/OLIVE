from datetime import timedelta

from rest_framework.response import Response
from rest_framework.views import APIView

from database.repositories import devices, facilities, recycling_requests, users
from database.repository import paginated, serialize, to_oid, utcnow
from utils.errors import ApiError
from utils.platform import audit, get_settings, notify
from utils.permissions import IsAdmin
from utils.security import safe_equal
from utils.uploads import save_image
from utils.validators import parse_date, validate
from .services import (ACTIVE, TRANSITIONS, create_request, enrich, history_entry, qr_payload, qr_png_base64,
                       verify_and_credit)

CREATE = {
    "device_id": {"type": "oid", "required": True},
    "facility_id": {"type": "oid", "required": True},
    "method": {"required": True, "choices": ["drop_off", "pickup"]},
    "pickup_address": {"max": 300},
    "preferred_date": {"type": "date", "required": True},
    "notes": {"max": 500},
}


class RequestListCreateView(APIView):
    throttle_scope = "upload"

    def get_throttles(self):
        return super().get_throttles() if self.request.method == "POST" else []

    def get(self, request):
        flt = {"user_id": request.user.oid}
        if request.query_params.get("status"):
            flt["status"] = request.query_params["status"]
        data = recycling_requests.paginate(request, flt, sort=[("created_at", -1)], default_size=10, transform=lambda d: d)
        data["results"] = enrich(data["results"])
        return Response(data)

    def post(self, request):
        d = validate(request.data, CREATE)
        device = devices.get(d["device_id"], "Device")
        if device["user_id"] != request.user.oid:
            raise ApiError("Device not found.", 404, "not_found")
        if device.get("status") != "analyzed":
            raise ApiError("This device already has a recycling request.", 409, "device_in_use")
        fac = facilities.get(d["facility_id"], "Facility")
        if fac.get("is_active") is False or fac.get("operating_status") != "operational":
            raise ApiError("This facility is not accepting devices right now.", 400, "facility_unavailable")
        if device["category"] not in fac.get("accepted_categories", []):
            raise ApiError("This facility does not accept that device category.", 400, "category_not_accepted")
        if d["method"] == "pickup" and not d.get("pickup_address"):
            raise ApiError("Enter a pickup address.", 400, "validation_error", {"pickup_address": "Required for pickup."})
        cfg = get_settings()
        today = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        if not (today <= d["preferred_date"] <= today + timedelta(days=cfg["max_pickup_days_ahead"])):
            raise ApiError(f"Choose a date within the next {cfg['max_pickup_days_ahead']} days.", 400, "validation_error",
                           {"preferred_date": "Date out of range."})
        files = request.FILES.getlist("photos")
        if len(files) > 4:
            raise ApiError("Upload at most 4 photos.", 400, "validation_error")
        photos = [save_image(f, "requests") for f in files]
        analysis = device.get("analysis", {})
        doc = create_request({
            "user_id": request.user.oid, "device_id": device["_id"], "facility_id": fac["_id"], "method": d["method"],
            "pickup_address": d.get("pickup_address", ""), "preferred_date": d["preferred_date"], "notes": d.get("notes", ""),
            "photos": photos, "status": "submitted", "reward_credited": False, "reviewed": False,
            "estimated_points": analysis.get("preliminary_points", 0), "estimated_materials": analysis.get("materials", []),
            "weight_g": device.get("weight_g"), "status_history": [history_entry("submitted", request.user.email)],
        })
        devices.update(device["_id"], {"status": "requested"})
        notify(request.user.oid, "request", "Request submitted", f"{doc['request_code']} was submitted to {fac['name']}.", "/recycling")
        return Response(enrich([doc])[0], status=201)


def own_request(request, pk):
    req = recycling_requests.get(pk, "Request")
    if req["user_id"] != request.user.oid:
        raise ApiError("Request not found.", 404, "not_found")
    return req


class RequestDetailView(APIView):
    def get(self, request, pk):
        return Response(enrich([own_request(request, pk)])[0])


class RequestQrView(APIView):
    def get(self, request, pk):
        req = own_request(request, pk)
        return Response({"request_code": req["request_code"], "qr_image": qr_png_base64(req), "payload_hint": "Show this QR at the facility."})


class RequestCancelView(APIView):
    def post(self, request, pk):
        req = own_request(request, pk)
        done = recycling_requests.col.find_one_and_update(
            {"_id": req["_id"], "status": {"$in": ["submitted", "under_review"]}},
            {"$set": {"status": "cancelled", "updated_at": utcnow()},
             "$push": {"status_history": history_entry("cancelled", request.user.email, "Cancelled by user")}}, return_document=True)
        if not done:
            raise ApiError("Only requests that are not yet approved can be cancelled.", 409, "not_allowed")
        devices.update(req["device_id"], {"status": "analyzed"})
        return Response(enrich([done])[0])


# ------------------------------ admin views ------------------------------
class AdminRequestListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        p = request.query_params
        flt = {}
        if p.get("status"):
            flt["status"] = p["status"]
        if p.get("facility_id"):
            flt["facility_id"] = to_oid(p["facility_id"])
        if p.get("q"):
            import re
            flt["request_code"] = {"$regex": re.escape(p["q"].strip().upper())}
        data = recycling_requests.paginate(request, flt, sort=[("created_at", -1)], default_size=15, transform=lambda d: d)
        data["results"] = enrich(data["results"], with_user=True)
        return Response(data)


class AdminRequestDetailView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        return Response(enrich([recycling_requests.get(pk, "Request")], with_user=True)[0])


class AdminStatusView(APIView):
    """PUT /api/admin/recycling/{id}/status/  body: {status, note}  ('verified' must use the verify endpoint)."""
    permission_classes = [IsAdmin]

    def put(self, request, pk):
        d = validate(request.data, {"status": {"required": True, "choices": ["under_review", "approved", "collected", "rejected", "completed"]},
                                    "note": {"max": 300}})
        req = recycling_requests.get(pk, "Request")
        if d["status"] not in TRANSITIONS.get(req["status"], []):
            raise ApiError(f"Cannot move a request from '{req['status']}' to '{d['status']}'.", 409, "invalid_transition")
        if d["status"] == "rejected" and not d.get("note"):
            raise ApiError("Add a reason for rejecting this request.", 400, "validation_error", {"note": "Reason required."})
        updated = recycling_requests.col.find_one_and_update(
            {"_id": req["_id"], "status": req["status"]},
            {"$set": {"status": d["status"], "updated_at": utcnow()},
             "$push": {"status_history": history_entry(d["status"], request.user.email, d.get("note", ""))}}, return_document=True)
        if not updated:
            raise ApiError("The request changed while you were editing. Reload and try again.", 409, "conflict")
        if d["status"] == "rejected":
            devices.update(req["device_id"], {"status": "analyzed"})
        messages = {"under_review": "is under review", "approved": "was approved. Your QR code is ready",
                    "collected": "was collected", "rejected": "was rejected: " + d.get("note", ""), "completed": "is complete"}
        kind = {"approved": "approval", "collected": "collection"}.get(d["status"], "request")
        notify(req["user_id"], kind, "Request update", f"{req['request_code']} {messages[d['status']]}.", "/recycling")
        audit(request, f"request.{d['status']}", "recycling_request", req["_id"], {"code": req["request_code"]})
        return Response(enrich([updated], with_user=True)[0])


class AdminVerifyView(APIView):
    """POST /api/admin/recycling/{id}/verify/ - verifies the device and credits points exactly once."""
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        d = validate(request.data, {"final_points": {"type": "int", "min": 0}, "verified_weight_g": {"type": "float", "min": 0},
                                    "verified_materials_mg": {"type": "dict"}, "note": {"max": 300}})
        req = recycling_requests.get(pk, "Request")
        mats = d.get("verified_materials_mg")
        if mats is not None:
            try:
                mats = {str(k)[:30]: float(v) for k, v in mats.items() if float(v) >= 0}
            except (TypeError, ValueError):
                raise ApiError("verified_materials_mg must map material names to numbers.", 400, "validation_error")
        done = verify_and_credit(req, request.user, d.get("final_points"), d.get("verified_weight_g"), mats, d.get("note", ""))
        audit(request, "request.verify", "recycling_request", req["_id"], {"code": req["request_code"], "points": done["final_points"]})
        return Response(enrich([done], with_user=True)[0])


class AdminScanView(APIView):
    """POST /api/admin/recycling/scan/ body: {payload: 'OLIVE:<code>:<token>'} -> request preview for the scanner."""
    permission_classes = [IsAdmin]

    def post(self, request):
        payload = str(request.data.get("payload", "")).strip()
        parts = payload.split(":")
        if len(parts) != 3 or parts[0] != "OLIVE":
            raise ApiError("This is not an OLIVE QR code.", 400, "invalid_qr")
        req = recycling_requests.find_one({"request_code": parts[1]})
        if not req or not safe_equal(req["qr_token"], parts[2]):
            raise ApiError("QR code not recognised.", 404, "invalid_qr")
        out = enrich([req], with_user=True)[0]
        out["can_verify"] = req["status"] in ("approved", "collected") and not req.get("reward_credited")
        return Response(out)
