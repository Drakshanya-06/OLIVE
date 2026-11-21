"""
Metal-recovery estimation engine.

Three clearly separated levels (never mixed up in the UI):
  1. estimated_content      - grams of each material estimated to be INSIDE the device (reference data).
  2. estimated_recoverable  - content x recovery rate x condition multiplier (what a recycler might recover).
  3. verified_recovered     - only set later by an administrator after real verification. Never produced here.

All rates, prices and factors come from admin-editable settings (system_settings) and the
device_materials reference collection. Nothing here is a verified scientific figure.
"""
import re

from database.repositories import device_materials
from utils.constants import CATEGORIES, CATEGORY_KEYS
from utils.errors import ApiError
from utils.platform import get_settings

DISCLAIMER = ("Estimates only. Real recovery depends on the recycler's process and the device's actual condition. "
              "Points are preliminary and are credited only after your request is verified.")


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def find_reference(category, brand, model):
    if brand and model:
        ref = device_materials.find_one({"category": category, "brand_key": norm(brand), "model_key": norm(model), "is_active": {"$ne": False}})
        if ref:
            return ref, "model_specific"
    ref = device_materials.find_one({"category": category, "is_category_default": True, "is_active": {"$ne": False}})
    if ref:
        return ref, "category_estimate"
    return None, None


def calculate(category, brand="", model="", condition="working", weight_g=None, purchase_year=None):
    if category not in CATEGORY_KEYS:
        raise ApiError("Unknown device category.", 400, "validation_error", {"category": "Choose a listed category."})
    cfg = get_settings()
    ref, kind = find_reference(category, brand, model)
    if not ref:
        raise ApiError("No reference data exists for this category yet. An administrator needs to add it.", 404, "no_reference")
    cat_meta = next(c for c in CATEGORIES if c["key"] == category)
    ref_weight = ref.get("weight_g") or cat_meta["default_weight_g"]
    weight = float(weight_g) if weight_g else float(ref_weight)
    scale = 1.0
    if kind == "category_estimate" and weight_g:
        scale = min(4.0, max(0.25, weight / ref_weight))  # category averages are scaled by entered weight, within limits
    cond_mult = cfg["condition_multipliers"].get(condition, 1.0)
    rate = ref.get("recovery_rate", cfg["default_recovery_rate"])
    prices = cfg["material_prices_inr_per_g"]

    materials, total_value = [], 0.0
    for name, mg in (ref.get("materials_mg") or {}).items():
        content_mg = mg * scale
        rec_mg = content_mg * rate * cond_mult
        value = (rec_mg / 1000.0) * prices.get(name, 0.0)
        total_value += value
        materials.append({"material": name, "estimated_content_mg": round(content_mg, 2),
                          "estimated_recoverable_mg": round(rec_mg, 2), "estimated_value_inr": round(value, 2)})
    materials.sort(key=lambda m: m["estimated_value_inr"], reverse=True)

    points = int(min(total_value * cfg["points_per_inr"], cfg["max_points_per_request"]))
    kg = weight / 1000.0
    env = {"landfill_diverted_kg": round(kg * cfg["landfill_diverted_share"], 3),
           "co2e_avoided_kg": round(kg * cfg["co2e_kg_avoided_per_kg_recycled"], 3)}
    return {
        "category": category, "brand": brand, "model": model, "condition": condition,
        "purchase_year": purchase_year, "weight_g": round(weight, 1),
        "estimate_type": kind,
        "estimate_label": "Model-specific reference" if kind == "model_specific" else "Category-based estimate",
        "confidence": "medium" if kind == "model_specific" and not ref.get("is_placeholder") else "low",
        "data_source": ref.get("data_source", "Not specified"),
        "is_placeholder_data": bool(ref.get("is_placeholder", True)),
        "recovery_rate": rate, "condition_multiplier": cond_mult,
        "levels": {"estimated_content": "Material estimated inside the device",
                   "estimated_recoverable": "What a recycler may recover (content x recovery rate x condition)",
                   "verified_recovered": None},
        "materials": materials,
        "estimated_value_inr": round(total_value, 2),
        "formula": f"points = recoverable value (INR) x {cfg['points_per_inr']} (capped at {cfg['max_points_per_request']})",
        "preliminary_points": points,
        "environment": env,
        "disclaimer": DISCLAIMER,
    }
