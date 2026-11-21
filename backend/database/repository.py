"""Generic data-access layer (repository pattern) over PyMongo."""
import math
from datetime import date, datetime, timezone

from bson import ObjectId
from pymongo import ReturnDocument

from utils.errors import ApiError
from .connection import get_db

HIDDEN_FIELDS = {"password_hash", "otp_hash", "qr_token", "failed_logins", "locked_until"}


def utcnow():
    return datetime.now(timezone.utc)


def to_oid(value, what="id"):
    if isinstance(value, ObjectId):
        return value
    if not ObjectId.is_valid(str(value)):
        raise ApiError(f"Invalid {what}.", 400, "invalid_id")
    return ObjectId(str(value))


def serialize(obj, hide=HIDDEN_FIELDS):
    """Make a Mongo document JSON-safe: ObjectId->str, datetime->ISO, drop secret fields."""
    if isinstance(obj, list):
        return [serialize(i, hide) for i in obj]
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k in hide:
                continue
            out["id" if k == "_id" else k] = serialize(v, hide)
        return out
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return obj


def page_params(request, default=12, maximum=100):
    try:
        page = max(1, int(request.query_params.get("page", 1)))
        size = min(maximum, max(1, int(request.query_params.get("page_size", default))))
    except ValueError:
        raise ApiError("Invalid pagination parameters.", 400, "invalid_page")
    return page, size


class Repository:
    def __init__(self, name):
        self.name = name

    @property
    def col(self):
        return get_db()[self.name]

    def create(self, doc):
        doc = dict(doc)
        now = utcnow()
        doc.setdefault("created_at", now)
        doc.setdefault("updated_at", now)
        doc["_id"] = self.col.insert_one(doc).inserted_id
        return doc

    def get(self, id_, what=None):
        doc = self.col.find_one({"_id": to_oid(id_)})
        if not doc and what:
            raise ApiError(f"{what} not found.", 404, "not_found")
        return doc

    def find_one(self, flt):
        return self.col.find_one(flt)

    def find(self, flt=None, sort=None, limit=0):
        cur = self.col.find(flt or {})
        if sort:
            cur = cur.sort(sort)
        if limit:
            cur = cur.limit(limit)
        return list(cur)

    def count(self, flt=None):
        return self.col.count_documents(flt or {})

    def update(self, id_, fields, ops=None):
        update = {"$set": {**fields, "updated_at": utcnow()}}
        if ops:
            update.update(ops)
        return self.col.find_one_and_update({"_id": to_oid(id_)}, update, return_document=ReturnDocument.AFTER)

    def delete(self, id_):
        return self.col.delete_one({"_id": to_oid(id_)}).deleted_count

    def paginate(self, request, flt=None, sort=None, default_size=12, maximum=100, transform=None):
        page, size = page_params(request, default_size, maximum)
        flt = flt or {}
        total = self.col.count_documents(flt)
        cur = self.col.find(flt)
        if sort:
            cur = cur.sort(sort)
        docs = list(cur.skip((page - 1) * size).limit(size))
        items = [transform(d) if transform else serialize(d) for d in docs]
        return paginated(items, total, page, size)


def paginated(items, total, page, size):
    return {"results": items, "count": total, "page": page, "page_size": size, "total_pages": max(1, math.ceil(total / size))}
