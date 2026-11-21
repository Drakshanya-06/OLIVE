"""Small schema validator + sanitiser used by every endpoint."""
import re
from datetime import date, datetime, timezone

from bson import ObjectId

from .errors import ApiError

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")
PHONE_RE = re.compile(r"^\+?[0-9]{10,13}$")
PIN_RE = re.compile(r"^[1-9][0-9]{5}$")
TAG_RE = re.compile(r"<[^>]*>")
CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def clean_text(value, max_len=None):
    s = CTRL_RE.sub("", TAG_RE.sub("", str(value))).strip()
    return s[:max_len] if max_len else s


def check_password_strength(password):
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if len(password) > 128:
        return "Password is too long."
    if not re.search(r"[A-Za-z]", password) or not re.search(r"[0-9]", password):
        return "Password must contain at least one letter and one number."
    return None


def parse_date(v):
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    if isinstance(v, date):
        return datetime(v.year, v.month, v.day, tzinfo=timezone.utc)
    s = str(v).strip()
    try:
        d = datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        raise ValueError("Use format YYYY-MM-DD.")
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def validate(data, schema, partial=False):
    """
    schema = {field: {type, required, min, max, choices, nullable, default}}
    types: str, email, phone, pin, int, float, bool, list, dict, date, oid
    Returns cleaned dict containing only schema keys. Raises ApiError(400) with per-field details.
    """
    if hasattr(data, "dict") and not isinstance(data, dict):
        data = data.dict()
    if not isinstance(data, dict):
        raise ApiError("Invalid request body.", 400, "invalid_body")
    out, errors = {}, {}
    for field, rule in schema.items():
        raw = data.get(field)
        if raw is None or (isinstance(raw, str) and raw.strip() == ""):
            if field in data and partial and rule.get("nullable"):
                out[field] = None
            elif rule.get("required") and not partial:
                errors[field] = "This field is required."
            elif "default" in rule and not partial and field not in out:
                out[field] = rule["default"]
            continue
        t = rule.get("type", "str")
        try:
            if t in ("str", "email", "phone", "pin"):
                if not isinstance(raw, (str, int)) or isinstance(raw, bool):
                    raise ValueError("Must be text.")
                v = clean_text(raw, rule.get("max", 2000))
                if len(v) < rule.get("min", 0):
                    raise ValueError(f"Must be at least {rule['min']} characters.")
                if t == "email":
                    v = v.lower()
                    if not EMAIL_RE.match(v):
                        raise ValueError("Enter a valid email address.")
                if t == "phone" and not PHONE_RE.match(v.replace(" ", "")):
                    raise ValueError("Enter a valid phone number (10-13 digits).")
                if t == "phone":
                    v = v.replace(" ", "")
                if t == "pin" and not PIN_RE.match(v):
                    raise ValueError("Enter a valid 6-digit PIN code.")
                if "choices" in rule and v not in rule["choices"]:
                    raise ValueError("Must be one of: " + ", ".join(rule["choices"]))
            elif t in ("int", "float"):
                if isinstance(raw, bool):
                    raise ValueError("Must be a number.")
                v = int(raw) if t == "int" else float(raw)
                if "min" in rule and v < rule["min"]:
                    raise ValueError(f"Must be at least {rule['min']}.")
                if "max" in rule and v > rule["max"]:
                    raise ValueError(f"Must be at most {rule['max']}.")
            elif t == "bool":
                if isinstance(raw, bool):
                    v = raw
                elif str(raw).lower() in ("true", "1", "yes", "on"):
                    v = True
                elif str(raw).lower() in ("false", "0", "no", "off"):
                    v = False
                else:
                    raise ValueError("Must be true or false.")
            elif t == "list":
                if not isinstance(raw, list):
                    raise ValueError("Must be a list.")
                if len(raw) > rule.get("max", 100):
                    raise ValueError("Too many items.")
                v = [clean_text(i, 500) if isinstance(i, str) else i for i in raw]
            elif t == "dict":
                if not isinstance(raw, dict):
                    raise ValueError("Must be an object.")
                v = raw
            elif t == "date":
                v = parse_date(raw)
            elif t == "oid":
                if not ObjectId.is_valid(str(raw)):
                    raise ValueError("Invalid id.")
                v = ObjectId(str(raw))
            else:
                v = raw
            out[field] = v
        except (ValueError, TypeError) as exc:
            errors[field] = str(exc) or "Invalid value."
    if errors:
        raise ApiError("Please correct the highlighted fields.", 400, "validation_error", errors)
    return out
