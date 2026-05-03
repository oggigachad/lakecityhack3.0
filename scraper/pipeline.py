"""
Scraper pipeline orchestrator.
Runs all scrapers, logs errors to scraper_logs, calls feed_to_db.
Pipeline NEVER crashes on a single scraper failure.
Verbose: prints every scraper result + per-item summary.
"""
import sys
import io
import logging
from pathlib import Path
from datetime import datetime

# Force UTF-8 output so Hindi/Unicode titles don't crash Windows console
if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, str(Path(__file__).parent.parent))

if hasattr(sys.stderr, 'buffer'):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from scrapers import (
    ndma_scraper,
    ndrf_scraper,
    imd_scraper,
    reliefweb_scraper,
    gdacs_scraper,
    news_scraper,
    mp_sdma_scraper,
    ambee_scraper,
    reddit_scraper,
    x_scraper,
    usgs_scraper,
    cwc_scraper,
    isro_scraper,
    air_news_scraper,
    schemes_scraper,
)
from feed_to_db import push_items, _get_db

logger = logging.getLogger(__name__)

# ASCII separators only -- Unicode crashes Windows cp1252 console
_SEP  = "-" * 64
_SEP2 = "=" * 64

SCRAPERS = [
    ("Schemes",     schemes_scraper.scrape),
    ("NDMA India",  ndma_scraper.scrape),
    ("NDRF India",  ndrf_scraper.scrape),
    ("IMD India",   imd_scraper.scrape),
    ("ReliefWeb",   reliefweb_scraper.scrape),
    ("GDACS",       gdacs_scraper.scrape),
    ("News",        news_scraper.scrape),
    ("MP SDMA",     mp_sdma_scraper.scrape),
    ("Ambee API",   ambee_scraper.scrape),
    ("Reddit",      reddit_scraper.scrape),
    ("X (Twitter)", x_scraper.scrape),
    ("USGS",        usgs_scraper.scrape),
    ("CWC Flood",   cwc_scraper.scrape),
    ("ISRO Bhuvan", isro_scraper.scrape),
    ("AIR News",    air_news_scraper.scrape),
]



def _log_error(db, source_name: str, error: str):
    """Write scraper failure to scraper_logs collection."""
    try:
        db["scraper_logs"].insert_one({
            "source_name": source_name,
            "error":       str(error),
            "timestamp":   datetime.utcnow(),
            "level":       "ERROR",
        })
    except Exception:
        pass


def run_pipeline():
    """Run all scrapers, aggregate results, push to DB. Never raises."""
    run_ts = datetime.utcnow().isoformat()
    logger.info(_SEP2)
    logger.info(f"PIPELINE START  [{run_ts}Z]")
    logger.info(_SEP2)

    try:
        db = _get_db()
    except Exception as e:
        logger.error(f"MongoDB connection failed — aborting pipeline: {e}")
        return {}

    all_items      = []
    results_summary = {}

    for name, fn in SCRAPERS:
        logger.info(_SEP)
        logger.info(f"SCRAPER: {name}")
        logger.info(_SEP)
        try:
            items = fn()

            # Tag each item with its scraper name
            for item in items:
                item["_scraper"] = name

            all_items.extend(items)
            results_summary[name] = len(items)

            # Log every fetched item
            if items:
                for i, item in enumerate(items, 1):
                    title     = item.get("title", "")[:90]
                    src_url   = item.get("source_url", "")[:80]
                    is_scheme = "  [SCHEME]" if item.get("is_scheme") else ""
                    logger.info(f"  {i:02d}.{is_scheme} {title}")
                    logger.info(f"       └─ {src_url}")
            else:
                logger.warning(f"  [ZERO] {name}: 0 items returned (site may be down or selectors changed)")

            logger.info(f"  [OK] {name}: {len(items)} items fetched")

            # Write success to scraper_logs
            db["scraper_logs"].insert_one({
                "source_name":   name,
                "items_fetched": len(items),
                "timestamp":     datetime.utcnow(),
                "level":         "INFO",
                "status":        "ok" if items else "empty",
            })

        except Exception as e:
            logger.error(f"  [FAIL] {name} FAILED: {e}")
            _log_error(db, name, str(e))
            results_summary[name] = 0
            try:
                db["scraper_meta"].update_one(
                    {"source_name": name},
                    {"$set": {
                        "last_run":   datetime.utcnow(),
                        "status":     "error",
                        "last_error": str(e),
                    }},
                    upsert=True,
                )
            except Exception:
                pass

    # ── Summary ────────────────────────────────────────────────────────────────
    logger.info(_SEP2)
    total_scraped = len(all_items)
    logger.info(f"TOTAL SCRAPED: {total_scraped} items across {len(SCRAPERS)} sources")
    for src, cnt in results_summary.items():
        status = "[OK]" if cnt > 0 else "[!!]"
        logger.info(f"  {status} {src:<20} {cnt} items")
    logger.info(_SEP2)

    if all_items:
        new_count = push_items(all_items)
        logger.info(f"NEW ITEMS STORED: {new_count}  (duplicates skipped)")
    else:
        logger.warning("No items scraped — nothing to push to DB.")

    logger.info(f"PIPELINE COMPLETE  [{datetime.utcnow().isoformat()}Z]")
    logger.info(_SEP2)
    return results_summary


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    run_pipeline()
