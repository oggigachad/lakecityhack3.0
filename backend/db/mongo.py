from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.collection import Collection
from core.config import settings
import logging

logger = logging.getLogger(__name__)

_client: MongoClient = None

def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
    return _client

def get_db():
    return get_client()[settings.DB_NAME]

def get_collection(name: str) -> Collection:
    return get_db()[name]

# Convenience refs
def users() -> Collection:
    return get_collection("users")

def incidents() -> Collection:
    return get_collection("incidents")

def scraped_feed() -> Collection:
    return get_collection("scraped_feed")

def schemes() -> Collection:
    return get_collection("schemes")

def audit_logs() -> Collection:
    return get_collection("audit_logs")

def scraper_meta() -> Collection:
    return get_collection("scraper_meta")

def create_indexes():
    """Create MongoDB indexes on startup."""
    try:
        incidents().create_index([("created_at", DESCENDING)])
        incidents().create_index([("severity", ASCENDING)])
        incidents().create_index([("type", ASCENDING)])
        incidents().create_index([("status", ASCENDING)])
        incidents().create_index([("source", ASCENDING)])
        incidents().create_index([("_fingerprint", ASCENDING)], sparse=True)  # fast dedup
        scraped_feed().create_index([("scraped_at", DESCENDING)])
        scraped_feed().create_index([("_fingerprint", ASCENDING)], sparse=True)
        users().create_index([("email", ASCENDING)], unique=True)
        schemes().create_index([("category", ASCENDING)])
        schemes().create_index([("_fingerprint", ASCENDING)], sparse=True)    # fast dedup
        schemes().create_index([("state", ASCENDING)])
        audit_logs().create_index([("incident_id", ASCENDING)])
        logger.info("MongoDB indexes created successfully")
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")
