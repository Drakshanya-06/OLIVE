"""Sample content for seed_demo. Everything facility/material related here is SAMPLE / PLACEHOLDER data."""
ALL = ["smartphone", "laptop", "desktop", "tablet", "battery", "charger", "television", "monitor", "other"]


def fac(name, ftype, city, state, pin, lat, lng, cats, hours="Mon-Sat 10:00-17:00"):
    return {"name": name, "facility_type": ftype, "address": f"Sample address, {city}", "city": city, "state": state, "pincode": pin,
            "latitude": lat, "longitude": lng, "phone": "", "email": "", "website": "", "operating_hours": hours,
            "accepted_categories": cats,
            "description": "SAMPLE record for academic demonstration. Not a real facility; do not visit or contact."}


FACILITIES = [
    fac("SAMPLE Collection Point - Nawanshahr", "government", "Nawanshahr", "Punjab", "144514", 31.1255, 76.1163, ALL[:6]),
    fac("SAMPLE Recycling Hub - Ludhiana", "private", "Ludhiana", "Punjab", "141001", 30.9010, 75.8573, ALL),
    fac("SAMPLE E-Waste Drop Centre - Jalandhar", "ngo", "Jalandhar", "Punjab", "144001", 31.3260, 75.5762, ["smartphone", "laptop", "battery", "charger", "tablet"]),
    fac("SAMPLE Authorised Collector - Chandigarh", "government", "Chandigarh", "Chandigarh", "160017", 30.7333, 76.7794, ALL),
    fac("SAMPLE Battery & Electronics Point - Amritsar", "private", "Amritsar", "Punjab", "143001", 31.6340, 74.8723, ["battery", "smartphone", "charger", "laptop"]),
    fac("SAMPLE Recycling Facility - New Delhi", "private", "New Delhi", "Delhi", "110001", 28.6139, 77.2090, ALL),
]

# (category, default weight g, materials in MILLIGRAMS per device, brand, model) ; brand None => category default
DEVICE_REFERENCE = [
    ("smartphone", 180, {"gold": 30, "silver": 300, "copper": 12000, "palladium": 12, "aluminium": 20000, "lithium": 600, "cobalt": 5000}, None, None),
    ("laptop", 2000, {"gold": 220, "silver": 1000, "copper": 60000, "palladium": 40, "aluminium": 300000, "lithium": 3000, "cobalt": 30000}, None, None),
    ("desktop", 8000, {"gold": 250, "silver": 1200, "copper": 500000, "palladium": 60, "aluminium": 1000000}, None, None),
    ("tablet", 480, {"gold": 50, "silver": 400, "copper": 20000, "palladium": 15, "aluminium": 90000, "lithium": 2000, "cobalt": 15000}, None, None),
    ("battery", 50, {"copper": 8000, "aluminium": 4000, "lithium": 700, "cobalt": 7000}, None, None),
    ("charger", 100, {"copper": 15000, "aluminium": 500, "silver": 5}, None, None),
    ("television", 9000, {"gold": 100, "silver": 400, "copper": 250000, "palladium": 20, "aluminium": 400000}, None, None),
    ("monitor", 4500, {"gold": 60, "silver": 300, "copper": 120000, "palladium": 15, "aluminium": 200000}, None, None),
    ("other", 500, {"gold": 10, "silver": 100, "copper": 20000, "aluminium": 10000}, None, None),
    ("smartphone", 175, {"gold": 28, "silver": 280, "copper": 11000, "palladium": 11, "aluminium": 18000, "lithium": 550, "cobalt": 4500}, "Sample", "Demo Phone X1"),
]

ACHIEVEMENTS = [
    {"key": "first_recycle", "title": "First Recycle", "description": "Had your first device verified.", "icon": "Recycle", "criteria": "verified_recycles", "threshold": 1},
    {"key": "recycler_3", "title": "Steady Recycler", "description": "Three verified recycles.", "icon": "Leaf", "criteria": "verified_recycles", "threshold": 3},
    {"key": "recycler_7", "title": "Green Champion", "description": "Seven verified recycles.", "icon": "Award", "criteria": "verified_recycles", "threshold": 7},
    {"key": "recycler_15", "title": "Earth Guardian", "description": "Fifteen verified recycles.", "icon": "Trophy", "criteria": "verified_recycles", "threshold": 15},
    {"key": "quiz_ace", "title": "Quiz Starter", "description": "Passed your first quiz.", "icon": "BookOpen", "criteria": "quizzes_passed", "threshold": 1},
    {"key": "scholar", "title": "E-Waste Scholar", "description": "Passed three different quizzes.", "icon": "GraduationCap", "criteria": "quizzes_passed", "threshold": 3},
    {"key": "reader", "title": "Curious Reader", "description": "Read three articles.", "icon": "Newspaper", "criteria": "articles_read", "threshold": 3},
    {"key": "challenger", "title": "Challenge Accepted", "description": "Completed a monthly challenge.", "icon": "Flag", "criteria": "challenges_completed", "threshold": 1},
]

ARTICLES = [
    {"title": "What is e-waste and why it matters", "category": "awareness", "cover_icon": "Recycle", "read_minutes": 4,
     "summary": "Discarded phones, laptops and batteries are one of the fastest-growing waste streams.",
     "content": "Electronic waste, or e-waste, is any discarded device with a plug or battery: phones, laptops, chargers, televisions and more.\n\nThese devices contain useful materials such as copper, aluminium, silver and small amounts of gold, but also substances that need careful handling. When devices end up in household bins or are burned informally, those substances can reach soil, water and air.\n\nFormal recycling recovers valuable metals, keeps hazardous parts out of landfill and reduces the need for new mining.\n\nThe simplest step you can take is to keep old electronics out of the bin and hand them to a facility that accepts them."},
    {"title": "Lead in electronics: where it is and what it does", "category": "hazards", "cover_icon": "AlertTriangle", "read_minutes": 3,
     "summary": "Lead appears in older solder and CRT glass. Risk comes mainly from crude dismantling or burning.",
     "content": "Lead has been used in solder on circuit boards and in the glass of older cathode-ray tube (CRT) screens.\n\nAn intact device does not expose you to meaningful lead. The concern arises when devices are broken apart, heated or burned without controls, which can release lead dust or fumes.\n\nLead affects the nervous system, and children are more sensitive to it than adults.\n\nTake CRT televisions and monitors to a facility that lists them as accepted, and do not break the screen."},
    {"title": "Mercury and cadmium in older devices", "category": "hazards", "cover_icon": "AlertTriangle", "read_minutes": 3,
     "summary": "Backlights in some older screens and nickel-cadmium batteries need specialist handling.",
     "content": "Mercury was used in the fluorescent backlights of some older LCD screens and in certain lamps and switches. Cadmium is found in older nickel-cadmium rechargeable batteries and some coatings.\n\nBoth are toxic if released into the environment, and cadmium dust or fumes are harmful when inhaled. Exposure is a risk during uncontrolled breaking or burning, not during normal use.\n\nNewer devices use LED backlights and lithium-ion cells, so these materials are far less common today. Older equipment is the main concern."},
    {"title": "Chromium and brominated flame retardants", "category": "hazards", "cover_icon": "AlertTriangle", "read_minutes": 3,
     "summary": "Where these substances appear in casings and coatings, and why open burning is the real problem.",
     "content": "Some metal parts carry chromium-based corrosion-protection coatings. Hexavalent chromium compounds can irritate the skin and lungs and are linked to cancer when inhaled over long periods.\n\nBrominated flame retardants are added to plastics and circuit boards to slow fires. Some persist in the environment, and burning plastics that contain them can release harmful by-products.\n\nControlled industrial recycling captures and treats these materials. Open burning of cables and casings does not, which is why informal burning is discouraged."},
    {"title": "Lithium-ion batteries: handle with care", "category": "tutorial", "cover_icon": "BatteryWarning", "read_minutes": 4,
     "summary": "Damaged cells can overheat. Learn how to store and hand over batteries safely.",
     "content": "Lithium-ion batteries power phones, laptops and many other devices. If a cell is punctured, crushed or short-circuited it can overheat and catch fire.\n\nSafe habits: never put batteries in household bins, do not puncture or crush them, and tape over the terminals of loose cells.\n\nIf a battery is swollen, hot or leaking, stop using it, keep it away from flammable items, store it in a non-flammable container and take it to a facility that accepts batteries.\n\nBatteries also contain cobalt, nickel and lithium that can be recovered when recycled properly."},
    {"title": "How to prepare a device for recycling", "category": "tutorial", "cover_icon": "ListChecks", "read_minutes": 3,
     "summary": "Back up, erase, remove accessories and bring the right paperwork.",
     "content": "Back up what you want to keep, sign out of your accounts and perform a factory reset.\n\nRemove SIM and memory cards. Keep the battery inside unless it is swollen.\n\nGather chargers and cables so they can be recycled together.\n\nAnalyze the device in OLIVE, choose a facility that accepts it, and submit a request. Show your QR code when you hand it over so the facility can verify it and your reward can be credited."},
]

QUIZZES = [
    {"title": "E-waste basics", "description": "Five questions on what e-waste is and how to dispose of it.",
     "questions": [
         {"question": "Which is the best place for a broken phone?", "options": ["Household dustbin", "A facility that accepts e-waste", "Burn it", "Bury it in the garden"], "correct_index": 1, "explanation": "Accepting facilities can recover materials and handle hazardous parts safely."},
         {"question": "Which metal is commonly recovered from circuit boards?", "options": ["Copper", "Wood", "Glass fibre only", "Paper"], "correct_index": 0, "explanation": "Circuit boards contain copper, along with small amounts of gold and silver."},
         {"question": "When is burning old cables acceptable?", "options": ["On windy days", "At night", "Never", "If done outdoors"], "correct_index": 2, "explanation": "Open burning releases harmful fumes and is not a safe recovery method."},
         {"question": "Before handing over a phone you should:", "options": ["Leave your data on it", "Back up and factory-reset it", "Remove the screen", "Paint it"], "correct_index": 1, "explanation": "Backing up and resetting protects your personal data."},
         {"question": "Does OLIVE credit final reward points as soon as you submit a request?", "options": ["Yes", "No, only after verification", "Only for phones", "Only on weekends"], "correct_index": 1, "explanation": "Points are credited after a facility verifies the device."}]},
    {"title": "Hazardous materials", "description": "Test what you know about substances found in electronics.",
     "questions": [
         {"question": "Which hazard is most associated with swollen lithium-ion batteries?", "options": ["Fire risk", "Radio interference", "Bad smell only", "Static noise"], "correct_index": 0, "explanation": "Damaged cells can overheat and ignite."},
         {"question": "Where is lead commonly found in older electronics?", "options": ["Solder and CRT glass", "Plastic buttons only", "Cardboard boxes", "Screens of new phones"], "correct_index": 0, "explanation": "Lead appears in solder and the glass of CRT displays."},
         {"question": "Which battery type is the older source of cadmium?", "options": ["Alkaline AA", "Nickel-cadmium", "Lithium coin cell", "Lead-free solar"], "correct_index": 1, "explanation": "Nickel-cadmium rechargeable cells contain cadmium."},
         {"question": "Are intact devices an exposure risk during normal use?", "options": ["Yes, always", "No, risk arises mainly from crude dismantling or burning", "Only if turned off", "Only when charging"], "correct_index": 1, "explanation": "The concern is uncontrolled breaking and burning, not normal use."},
         {"question": "Why are brominated flame retardants a concern?", "options": ["They are heavy", "Some persist in the environment and burning can release harmful by-products", "They are magnetic", "They glow"], "correct_index": 1, "explanation": "Controlled recycling captures them; open burning does not."}]},
]

COUPONS = [
    {"title": "SAMPLE: Rs 50 eco-store voucher", "description": "Demo voucher for the academic project.", "code": "SAMPLE-ECO50", "points_cost": 100, "stock": 100},
    {"title": "SAMPLE: Plant-a-tree certificate", "description": "Demo certificate for the academic project.", "code": "SAMPLE-TREE", "points_cost": 150, "stock": 100},
    {"title": "SAMPLE: Rs 100 accessories voucher", "description": "Demo voucher for the academic project.", "code": "SAMPLE-ACC100", "points_cost": 250, "stock": 50},
]
