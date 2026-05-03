"""
feed_to_db.py — Pushes scraped items into MongoDB.

Routing logic:
  • Items with is_scheme=True  → 'schemes' collection
  • All other scraped items    → 'scraped_feed'  +  'incidents' (so they appear on IncidentsPage)

Also pings the backend /internal/broadcast endpoint to push live WS events.
Called by pipeline.py:  from feed_to_db import push_items, _get_db
"""
import os
import sys
import logging
import httpx
from pathlib import Path
from datetime import datetime

# Make sure parent packages are importable (veri_ai, etc.)
sys.path.insert(0, str(Path(__file__).parent.parent))

from pymongo import MongoClient
from pymongo.collection import Collection
from dotenv import load_dotenv

# Import geocoder
sys.path.insert(0, str(Path(__file__).parent.parent / "veri_ai"))
from geocoder import extract_coordinates

# Load backend .env for MONGO_URI / DB_NAME
_ENV_PATH = Path(__file__).parent.parent / "backend" / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

MONGO_URI   = os.getenv("MONGO_URI",   "mongodb://localhost:27017/verisignal")
DB_NAME     = os.getenv("DB_NAME",     "verisignal")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

logger = logging.getLogger(__name__)

_client: MongoClient | None = None


def _get_db():
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    return _client[DB_NAME]


def _scraped_feed(db) -> Collection:
    return db["scraped_feed"]


def _scraper_meta(db) -> Collection:
    return db["scraper_meta"]


def _schemes_col(db) -> Collection:
    return db["schemes"]


def _incidents_col(db) -> Collection:
    return db["incidents"]


# ── VeriAI analysis ────────────────────────────────────────────────────────────

def _analyze(text: str, source: str = "scraper") -> dict:
    """Run VeriAI analysis; gracefully fall back if model not available."""
    try:
        from veri_ai.pipeline import analyze
        return analyze(text, source=source)
    except Exception as e:
        logger.warning(f"VeriAI analysis failed, using heuristic defaults: {e}")
        return {
            "severity":    "LOW",
            "sentiment":   "neutral",
            "crisis_type": "other",
            "confidence":  0.70,
            "is_verified": True,
            "source":      "scraper",
            "label":       "real",
        }


# ── WebSocket broadcast ────────────────────────────────────────────────────────

def _broadcast(item: dict, veri: dict):
    """Fire-and-forget POST to backend /internal/broadcast (non-blocking)."""
    try:
        payload = {
            "type": "new_incident",
            "payload": {
                "id":         str(item.get("_id", "")),
                "title":      item.get("title", "")[:120],
                "severity":   veri.get("severity", "LOW"),
                "type":       veri.get("crisis_type", "other"),
                "source":     item.get("source_name", "scraper"),
                "location":   item.get("location", {}),
                "created_at": item.get("scraped_at", datetime.utcnow()).isoformat()
                              if isinstance(item.get("scraped_at"), datetime)
                              else str(item.get("scraped_at", "")),
                "is_verified":   veri.get("is_verified", False),
                "confidence":    veri.get("confidence", 0.0),
            },
        }
        httpx.post(f"{BACKEND_URL}/internal/broadcast", json=payload, timeout=3)
    except Exception as e:
        logger.debug(f"WS broadcast skipped (backend may not be running): {e}")


# ── Scheme routing ─────────────────────────────────────────────────────────────

def _push_scheme(db, item: dict, veri: dict) -> bool:
    """
    Insert a scheme item into the 'schemes' collection.
    Maps scraped fields → SchemesPage expected fields.
    Returns True if newly inserted.
    """
    col = _schemes_col(db)

    title       = item.get("scheme_title") or item.get("title", "")
    source_url  = item.get("source_url", "")
    raw_text    = item.get("raw_text") or item.get("title", "")
    state       = item.get("state", "National")
    source_name = item.get("source_name", item.get("_scraper", "unknown"))

    # De-dup by source_url + title fingerprint (NOT scraped_feed)
    fingerprint = f"{source_url}|{title[:120]}"
    if col.find_one({"_fingerprint": fingerprint}, {"_id": 1}):
        logger.debug(f"  [scheme-dup] {title[:60]}")
        return False

    # Infer category from VeriAI crisis_type or keywords
    category = veri.get("crisis_type", "disaster relief")
    if category == "other":
        category = "disaster relief"

    doc = {
        "_fingerprint": fingerprint,
        "title":        title[:120],
        "description":  raw_text[:500],   # SchemesPage reads 'description'
        "link":         source_url,        # SchemesPage reads 'link'
        "source_url":   source_url,
        "source_name":  source_name,
        "category":     category,
        "state":        state,
        "type":         item.get("type", "All Disasters"),
        "eligibility":  item.get("eligibility", "Applicable as per state norms"),
        "benefits":     item.get("benefits", "Financial or resource assistance"),
        "scraped_at":   item.get("scraped_at", datetime.utcnow()),
        "is_scheme":    True,
    }

    col.insert_one(doc)
    logger.info(f"  [scheme+] {title[:80]}  state={state}")
    return True


# ── Incident routing ───────────────────────────────────────────────────────────

def _push_incident(db, item: dict, veri: dict) -> bool:
    """
    Insert a scraped item into the 'incidents' collection so it appears
    on the IncidentsPage. Also inserts into scraped_feed for raw archive.
    Deduplication is done against the INCIDENTS collection so that items
    already in scraped_feed (from old pipeline) still get promoted here.
    Returns True if newly inserted.
    """
    raw_text    = item.get("raw_text") or item.get("title") or ""
    source_url  = item.get("source_url", "")

    fingerprint = (source_url + raw_text[:200])

    feed_col = _scraped_feed(db)
    inc_col  = _incidents_col(db)

    # Dedup against INCIDENTS (not scraped_feed) so old items get promoted
    if inc_col.find_one({"_fingerprint": fingerprint}, {"_id": 1}):
        logger.debug(f"  [inc-dup] {raw_text[:60]}")
        return False

    now = datetime.utcnow()

    # --- Insert raw archive into scraped_feed ---
    # Geocode using Claude Haiku if location is default
    loc = item.get("location", {"lat": 20.5937, "lng": 78.9629})
    if loc.get("lat") == 20.5937 and loc.get("lng") == 78.9629:
        loc = extract_coordinates(raw_text)

    feed_doc = {
        "_fingerprint": fingerprint,
        "title":        item.get("title", raw_text[:120]),
        "raw_text":     raw_text,
        "source_url":   source_url,
        "source_name":  item.get("source_name", item.get("_scraper", "unknown")),
        "location":     loc,
        "scraped_at":   item.get("scraped_at", now),
        "veri_analysis": veri,
    }
    feed_result = feed_col.insert_one(feed_doc)

    # --- Also insert into incidents so IncidentsPage shows it ---
    inc_doc = {
        "_fingerprint": fingerprint,   # used for dedup on next run
        "title":       feed_doc["title"],
        "description": raw_text[:1000],
        "type":        veri.get("crisis_type", "other"),
        "severity":    veri.get("severity", "LOW"),
        "sentiment":   veri.get("sentiment", "neutral"),
        "confidence":  veri.get("confidence", 0.70),
        "is_verified": veri.get("is_verified", True),
        "source":      "scraped",
        "source_name": feed_doc["source_name"],
        "source_url":  source_url,
        "location":    feed_doc["location"],
        "status":      "open",
        "reported_by": None,
        "assigned_to": None,
        "created_at":  feed_doc["scraped_at"],
        "updated_at":  now,
        "veri_analysis": veri,
        "_feed_id":    feed_result.inserted_id,   # back-reference
    }
    inc_result = inc_col.insert_one(inc_doc)
    feed_doc["_id"] = inc_result.inserted_id  # use inc_id for WS broadcast

    logger.info(
        f"  [incident+] [{veri.get('severity','?')}] {feed_doc['title'][:80]}"
        f"  src={feed_doc['source_name']}"
    )

    # Broadcast ALL new incidents via backend WS (powers real-time frontend updates)
    _broadcast(feed_doc, veri)

    return True


# ── Main entry point ───────────────────────────────────────────────────────────

def push_items(items: list) -> int:
    """
    Analyse and upsert scraped items into MongoDB.
    Schemes → schemes collection.
    Regular → scraped_feed + incidents collection.
    Returns number of newly inserted documents.
    """
    if not items:
        return 0

    db = _get_db()

    inserted     = 0
    schemes_ins  = 0
    source_counts: dict[str, int] = {}

    for item in items:
        raw_text = item.get("raw_text") or item.get("title") or ""
        if not raw_text.strip():
            continue

        source_name = item.get("source_name", item.get("_scraper", "scraper"))
        veri = _analyze(raw_text, source=source_name)

        if item.get("is_scheme"):
            # ── Route to schemes collection ──────────────────────────────────
            if _push_scheme(db, item, veri):
                schemes_ins += 1
        else:
            # ── Route to scraped_feed + incidents ────────────────────────────
            if _push_incident(db, item, veri):
                inserted += 1
                sn = item.get("source_name", item.get("_scraper", "unknown"))
                source_counts[sn] = source_counts.get(sn, 0) + 1

    # Update scraper_meta per source
    meta_col = _scraper_meta(db)
    for source_name, count in source_counts.items():
        meta_col.update_one(
            {"source_name": source_name},
            {"$set": {
                "last_run":   datetime.utcnow(),
                "status":     "ok",
                "last_error": None,
            },
             "$inc": {"total_ingested": count}},
            upsert=True,
        )

    logger.info(
        f"feed_to_db: inserted {inserted} new incidents + {schemes_ins} new schemes "
        f"(from {len(items)} total scraped items)"
    )
    return inserted + schemes_ins
