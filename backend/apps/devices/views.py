import base64
import json
import re

import requests
from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from database.repositories import device_materials, devices, facilities
from database.repository import serialize, utcnow
from utils.constants import CATEGORIES, CATEGORY_KEYS, CONDITIONS, DISPOSAL_ADVICE
from utils.errors import ApiError
from utils.uploads import image_to_jpeg_bytes, read_image, save_image
from utils.validators import validate
from apps.facilities.services import build_filter, haversine_km, parse_coords
from .services import calculate, norm

ANALYZE = {
    "category": {"required": True, "choices": CATEGORY_KEYS},
    "brand": {"max": 60}, "model": {"max": 80},
    "condition": {"choices": CONDITIONS, "default": "working"},
    "purchase_year": {"type": "int", "min": 1990, "max": 2100},
    "weight_g": {"type": "float", "min": 1, "max": 100000},
}


class Public(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]


class CategoriesView(Public):
    def get(self, request):
        return Response({"results": CATEGORIES, "conditions": CONDITIONS})


class BrandsView(Public):
    """Distinct brands/models that have model-specific reference data for a category (drives the dropdowns)."""

    def get(self, request):
        cat = request.query_params.get("category")
        flt = {"is_category_default": {"$ne": True}, "is_active": {"$ne": False}}
        if cat:
            flt["category"] = cat
        docs = device_materials.find(flt, sort=[("brand", 1)])
        out = {}
        for d in docs:
            out.setdefault(d["brand"], []).append(d["model"])
        return Response({"results": [{"brand": b, "models": m} for b, m in out.items()]})


class ReferenceListView(Public):
    """GET /api/devices/ - the configurable device reference database (public, read-only)."""

    def get(self, request):
        flt = {"is_active": {"$ne": False}}
        if request.query_params.get("category") in CATEGORY_KEYS:
            flt["category"] = request.query_params["category"]
        if request.query_params.get("q"):
            rx = {"$regex": re.escape(request.query_params["q"]), "$options": "i"}
            flt["$or"] = [{"brand": rx}, {"model": rx}]
        return Response(device_materials.paginate(request, flt, sort=[("category", 1), ("brand", 1)], default_size=20))


class EstimateView(Public):
    """Public quick estimate (not saved). Powers the home-page calculator."""
    throttle_scope = "anon"

    def post(self, request):
        d = validate(request.data, ANALYZE)
        return Response(calculate(d["category"], d.get("brand", ""), d.get("model", ""), d.get("condition", "working"),
                                  d.get("weight_g"), d.get("purchase_year")))


class AnalyzeView(APIView):
    """POST /api/devices/analyze/ - saves the analysis to the user's devices (multipart with optional `photo`)."""
    throttle_scope = "upload"

    def post(self, request):
        d = validate(request.data, ANALYZE)
        result = calculate(d["category"], d.get("brand", ""), d.get("model", ""), d.get("condition", "working"),
                           d.get("weight_g"), d.get("purchase_year"))
        photo = request.FILES.get("photo")
        photo_url = save_image(photo, "devices") if photo else None
        doc = devices.create({"user_id": request.user.oid, "category": d["category"], "brand": d.get("brand", ""),
                              "model": d.get("model", ""), "condition": d.get("condition", "working"),
                              "purchase_year": d.get("purchase_year"), "weight_g": result["weight_g"],
                              "photo_url": photo_url, "analysis": result, "status": "analyzed"})
        return Response({"device": serialize(doc), "analysis": result}, status=201)


class MyDevicesView(APIView):
    def get(self, request):
        return Response(devices.paginate(request, {"user_id": request.user.oid}, sort=[("created_at", -1)], default_size=20))


class MyDeviceDetailView(APIView):
    def get(self, request, pk):
        doc = devices.get(pk, "Device")
        if doc["user_id"] != request.user.oid:
            raise ApiError("Device not found.", 404, "not_found")
        return Response(serialize(doc))

    def delete(self, request, pk):
        doc = devices.get(pk, "Device")
        if doc["user_id"] != request.user.oid or doc.get("status") != "analyzed":
            raise ApiError("This device cannot be deleted.", 400, "not_allowed")
        devices.delete(pk)
        return Response(status=204)


AI_PROMPT = ("You identify consumer electronic devices from photos for an e-waste recycling app. "
             "Reply with ONLY a JSON object: {\"category\": one of " + ", ".join(CATEGORY_KEYS) + ", "
             "\"brand\": string or \"\", \"model\": string or \"\", \"confidence\": \"low\"|\"medium\"|\"high\", "
             "\"notes\": short string}. Use empty strings when unsure. Never guess a model you cannot see.")


class RecognizeImageView(APIView):
    """POST /api/devices/recognize-image/ - optional AI suggestion. ALWAYS a suggestion the user must confirm."""
    throttle_scope = "ai"

    def post(self, request):
        file = request.FILES.get("image")
        if not file:
            raise ApiError("Attach an image in the 'image' field.", 400, "validation_error")
        if not settings.ANTHROPIC_API_KEY:
            read_image(file)
            return Response({"available": False, "needs_confirmation": True,
                            "message": "AI recognition is not configured on this server. Choose the category and enter the brand and model manually."})
        data = image_to_jpeg_bytes(file)
        try:
            r = requests.post(
                "https://api.anthropic.com/v1/messages", timeout=40,
                headers={"x-api-key": settings.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json={"model": settings.AI_MODEL, "max_tokens": 300, "system": AI_PROMPT,
                      "messages": [{"role": "user", "content": [
                          {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": base64.b64encode(data).decode()}},
                          {"type": "text", "text": "Identify this device."}]}]})
            r.raise_for_status()
            text = "".join(b.get("text", "") for b in r.json().get("content", []))
            m = re.search(r"\{.*\}", text, re.S)
            parsed = json.loads(m.group(0)) if m else {}
        except Exception:
            return Response({"available": True, "failed": True, "needs_confirmation": True,
                             "message": "We could not analyse that photo. Enter the device details manually."})
        cat = parsed.get("category") if parsed.get("category") in CATEGORY_KEYS else ""
        return Response({"available": True, "needs_confirmation": True,
                         "suggestion": {"category": cat, "brand": str(parsed.get("brand", ""))[:60], "model": str(parsed.get("model", ""))[:80],
                                        "confidence": parsed.get("confidence", "low"), "notes": str(parsed.get("notes", ""))[:200]},
                         "message": "This is an AI suggestion, not a confirmed identification. Please check the details."})


class RecommendView(Public):
    """GET /api/devices/recommend/?category=battery&lat=..&lng=.. - disposal advice + nearest accepting facilities."""

    def get(self, request):
        cat = request.query_params.get("category", "other")
        if cat not in CATEGORY_KEYS:
            raise ApiError("Unknown category.", 400, "validation_error")
        flt = build_filter({"accepts": cat}, public=True)
        coords = parse_coords(request.query_params)
        docs = facilities.find(flt, limit=500)
        items = []
        for f in docs:
            o = serialize(f)
            if coords:
                o["distance_km"] = round(haversine_km(coords[0], coords[1], f["latitude"], f["longitude"]), 1)
            items.append(o)
        if coords:
            items.sort(key=lambda i: i["distance_km"])
        return Response({"category": cat, "advice": DISPOSAL_ADVICE[cat], "facilities": items[:5]})
