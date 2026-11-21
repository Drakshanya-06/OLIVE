import requests
from django.core.cache import cache
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from database.repositories import facilities, facility_reviews, recycling_requests, users
from database.repository import paginated, serialize, to_oid, utcnow
from utils.errors import ApiError
from utils.platform import notify
from utils.validators import validate
from .services import build_filter, haversine_km, parse_coords


class Public(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]


def with_distance(doc, coords):
    out = serialize(doc)
    if coords:
        out["distance_km"] = round(haversine_km(coords[0], coords[1], doc["latitude"], doc["longitude"]), 2)
    return out


class FacilityListView(Public):
    """GET /api/facilities/ - filters: q, city, pincode, type, accepts, status, verified, lat, lng, radius_km."""

    def get(self, request):
        p = request.query_params
        coords = parse_coords(p)
        docs = facilities.find(build_filter(p), sort=[("name", 1)], limit=1000)
        items = [with_distance(d, coords) for d in docs]
        if coords and p.get("radius_km"):
            try:
                radius = float(p["radius_km"])
            except ValueError:
                raise ApiError("Invalid radius.", 400, "invalid_radius")
            items = [i for i in items if i["distance_km"] <= radius]
        if coords:
            items.sort(key=lambda i: i["distance_km"])
        try:
            page, size = max(1, int(p.get("page", 1))), min(200, max(1, int(p.get("page_size", 50))))
        except ValueError:
            raise ApiError("Invalid pagination parameters.", 400, "invalid_page")
        start = (page - 1) * size
        return Response(paginated(items[start:start + size], len(items), page, size))


class NearbyView(Public):
    """GET /api/facilities/nearby/?lat=&lng=&radius_km=25"""

    def get(self, request):
        coords = parse_coords(request.query_params)
        if not coords:
            raise ApiError("lat and lng are required.", 400, "validation_error")
        try:
            radius = float(request.query_params.get("radius_km", 25))
        except ValueError:
            raise ApiError("Invalid radius.", 400, "invalid_radius")
        docs = facilities.find(build_filter(request.query_params), limit=1000)
        items = [with_distance(d, coords) for d in docs]
        items = sorted([i for i in items if i["distance_km"] <= radius], key=lambda i: i["distance_km"])[:50]
        return Response({"results": items, "count": len(items), "radius_km": radius})


class FacilityDetailView(Public):
    def get(self, request, pk):
        doc = facilities.get(pk, "Facility")
        if doc.get("is_active") is False:
            raise ApiError("Facility not found.", 404, "not_found")
        return Response(with_distance(doc, parse_coords(request.query_params)))


class GeocodeView(Public):
    """GET /api/facilities/geocode/?q=Ludhiana or 141001 -> lat/lng via OpenStreetMap Nominatim (cached)."""
    throttle_scope = "geocode"

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()[:100]
        if len(q) < 3:
            raise ApiError("Enter a city or 6-digit PIN code.", 400, "validation_error")
        key = "geo:" + q.lower()
        hit = cache.get(key)
        if hit is not None:
            return Response(hit)
        params = {"format": "json", "limit": 1, "countrycodes": "in"}
        params["postalcode" if q.isdigit() and len(q) == 6 else "q"] = q
        try:
            r = requests.get("https://nominatim.openstreetmap.org/search", params=params, timeout=8,
                             headers={"User-Agent": "OLIVE-EwasteLocator/1.0 (academic project)"})
            r.raise_for_status()
            data = r.json()
        except Exception:
            raise ApiError("Location search is unavailable right now. Try again shortly.", 502, "geocode_failed")
        if not data:
            raise ApiError("We could not find that place. Try a nearby city or another PIN code.", 404, "not_found")
        out = {"lat": float(data[0]["lat"]), "lng": float(data[0]["lon"]), "label": data[0].get("display_name", q)}
        cache.set(key, out, 60 * 60 * 24)
        return Response(out)


class FacilityReviewsView(APIView):
    def get_permissions(self):
        from rest_framework.permissions import IsAuthenticated
        return [AllowAny()] if self.request.method == "GET" else [IsAuthenticated()]

    def get_authenticators(self):
        return super().get_authenticators()

    def get(self, request, pk):
        oid = to_oid(pk)
        docs = facility_reviews.find({"facility_id": oid}, sort=[("created_at", -1)], limit=50)
        names = {u["_id"]: u.get("name", "User") for u in users.find({"_id": {"$in": [d["user_id"] for d in docs]}})}
        out = []
        for d in docs:
            n = names.get(d["user_id"], "User").split(" ")[0]
            out.append({"id": str(d["_id"]), "rating": d["rating"], "comment": d.get("comment", ""),
                        "author": n, "created_at": d["created_at"].isoformat()})
        return Response({"results": out})

    def post(self, request, pk):
        """Only users with a COMPLETED/VERIFIED request at this facility can review it (once per request)."""
        oid = to_oid(pk)
        facilities.get(oid, "Facility")
        d = validate(request.data, {"rating": {"type": "int", "required": True, "min": 1, "max": 5}, "comment": {"max": 500}})
        req = recycling_requests.find_one({"user_id": request.user.oid, "facility_id": oid,
                                           "status": {"$in": ["verified", "completed"]}, "reviewed": {"$ne": True}})
        if not req:
            raise ApiError("You can review a facility after one of your requests there is verified.", 403, "not_eligible")
        facility_reviews.create({"facility_id": oid, "user_id": request.user.oid, "request_id": req["_id"],
                                 "rating": d["rating"], "comment": d.get("comment", "")})
        recycling_requests.update(req["_id"], {"reviewed": True})
        agg = list(facility_reviews.col.find({"facility_id": oid}, {"rating": 1}))
        avg = round(sum(a["rating"] for a in agg) / len(agg), 2)
        facilities.update(oid, {"rating_avg": avg, "rating_count": len(agg)})
        return Response({"message": "Thanks for your review.", "rating_avg": avg}, status=201)
