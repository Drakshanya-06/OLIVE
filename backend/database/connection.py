"""Single shared MongoDB connection. Credentials come from environment variables only."""
import logging

from django.conf import settings

logger = logging.getLogger(__name__)
_client = None
_db = None


def get_db():
    global _client, _db
    if _db is not None:
        return _db
    if settings.MONGO_USE_MOCK:
        import mongomock
        logger.warning("Using IN-MEMORY mock MongoDB. Data will be lost on restart.")
        _client = mongomock.MongoClient(tz_aware=True)
    else:
        if not settings.MONGO_URI:
            raise RuntimeError("MONGO_URI is not set. Copy .env.example to .env and fill it in.")
        from pymongo import MongoClient
        import certifi
        _client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=8000, tz_aware=True, appname="olive", tlsCAFile=certifi.where())
    _db = _client[settings.MONGO_DB_NAME]
    return _db


def ping():
    get_db().command("ping")
    return True
