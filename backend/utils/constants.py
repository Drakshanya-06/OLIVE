CATEGORIES = [
    {"key": "smartphone", "label": "Smartphones", "default_weight_g": 180},
    {"key": "laptop", "label": "Laptops", "default_weight_g": 2000},
    {"key": "desktop", "label": "Desktop computers", "default_weight_g": 8000},
    {"key": "tablet", "label": "Tablets", "default_weight_g": 480},
    {"key": "battery", "label": "Batteries", "default_weight_g": 50},
    {"key": "charger", "label": "Chargers", "default_weight_g": 100},
    {"key": "television", "label": "Televisions", "default_weight_g": 9000},
    {"key": "monitor", "label": "Monitors", "default_weight_g": 4500},
    {"key": "other", "label": "Other electronics", "default_weight_g": 500},
]
CATEGORY_KEYS = [c["key"] for c in CATEGORIES]
CONDITIONS = ["working", "damaged", "not_working"]
REQUEST_STATUSES = ["submitted", "under_review", "approved", "collected", "verified", "completed", "rejected", "cancelled"]

DISPOSAL_ADVICE = {
    "smartphone": ["Back up and factory-reset the phone, then remove SIM and memory cards.",
                   "Keep the battery inside unless it is swollen; swollen batteries need separate handling.",
                   "Drop it at a verified e-waste collection point or use an authorised pickup."],
    "laptop": ["Back up data and securely erase the drive before handing it over.",
               "Do not open the casing; the battery and board are best handled by recyclers."],
    "desktop": ["Wipe or remove storage drives, and keep cables and peripherals together for the recycler."],
    "tablet": ["Reset the tablet and sign out of accounts. Treat a swollen battery as a hazard."],
    "battery": ["Never put batteries in household bin or burn them. Tape the terminals of lithium cells.",
                "Store damaged or swollen batteries in a non-flammable container and take them to a facility that accepts batteries."],
    "charger": ["Bundle cables together; chargers are mostly copper and plastic and are easy to recycle."],
    "television": ["Do not break screens. Older CRT and some LCD sets contain materials that need specialist handling.",
                   "Choose a facility that lists televisions as accepted."],
    "monitor": ["Carry the monitor upright and avoid cracking the panel; check the facility accepts monitors."],
    "other": ["Check the facility's accepted list before travelling; call ahead for large or unusual items."],
}
