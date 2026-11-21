import io
import uuid
from pathlib import Path

from django.conf import settings
from PIL import Image, UnidentifiedImageError

from .errors import ApiError

MAX_BYTES = 5 * 1024 * 1024
ALLOWED = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}


def read_image(file):
    """Validate an uploaded image (size, real image content, allowed format). Returns PIL image."""
    if file.size > MAX_BYTES:
        raise ApiError("Image must be 5 MB or smaller.", 400, "file_too_large")
    try:
        img = Image.open(file)
        img.verify()
        file.seek(0)
        img = Image.open(file)
    except (UnidentifiedImageError, OSError, SyntaxError):
        raise ApiError("Upload a valid JPG, PNG or WEBP image.", 400, "invalid_image")
    if img.format not in ALLOWED:
        raise ApiError("Only JPG, PNG or WEBP images are allowed.", 400, "invalid_image")
    return img


def save_image(file, subdir="uploads"):
    """Re-encodes the image (strips EXIF/metadata, neutralises embedded payloads) under a random name."""
    img = read_image(file)
    img.thumbnail((1600, 1600))
    ext = ALLOWED[img.format] if img.format in ALLOWED else "jpg"
    if img.mode not in ("RGB", "L") and ext == "jpg":
        img = img.convert("RGB")
    folder = Path(settings.MEDIA_ROOT) / subdir
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}.{ext}"
    img.save(folder / name)
    return f"{settings.MEDIA_URL}{subdir}/{name}"


def image_to_jpeg_bytes(file):
    img = read_image(file)
    img.thumbnail((1024, 1024))
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=85)
    return buf.getvalue()
