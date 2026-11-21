import math

from utils.errors import ApiError


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def parse_coords(params):
    try:
        lat, lng = float(params.get("lat")), float(params.get("lng"))
    except (TypeError, ValueError):
        return None
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise ApiError("Invalid coordinates.", 400, "invalid_coordinates")
    return lat, lng


def build_filter(params, public=True):
    import re
    flt = {}
    if public:
        flt["is_active"] = {"$ne": False}
    if params.get("city"):
        flt["city"] = {"$regex": "^" + re.escape(params["city"].strip()) + "$", "$options": "i"}
    if params.get("pincode"):
        flt["pincode"] = params["pincode"].strip()
    if params.get("type") in ("government", "private", "ngo"):
        flt["facility_type"] = params["type"]
    if params.get("accepts"):
        flt["accepted_categories"] = params["accepts"]
    if params.get("status") in ("operational", "temporarily_closed", "closed"):
        flt["operating_status"] = params["status"]
    if params.get("verified") in ("true", "1"):
        flt["verification_status"] = "verified"
    if params.get("q"):
        rx = {"$regex": re.escape(params["q"].strip()), "$options": "i"}
        flt["$or"] = [{"name": rx}, {"city": rx}, {"address": rx}, {"pincode": rx}]
    return flt
