#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_scraper_pipeline.py
Run this from the /scraper directory to verify every scraper + DB routing.

Usage:
    cd verisignal/scraper
    python test_scraper_pipeline.py

It will:
  1. Run every scraper individually and print all fetched items
  2. Push items through feed_to_db (incidents + schemes routing)
  3. Query MongoDB and report counts in each collection
  4. Print a PASS/FAIL summary
"""
import sys
import io
import logging
from pathlib import Path
from datetime import datetime

# Force UTF-8 output on Windows so Unicode in titles doesn't crash print()
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Make sure imports resolve from /scraper directory
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger("test_pipeline")

SEP  = "-" * 70
SEP2 = "=" * 70

# ---------------------------------------------------------------------------
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
)
from feed_to_db import push_items, _get_db

SCRAPERS = [
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


def p(msg=""):
    """Print helper — always flushes."""
    print(msg, flush=True)


def test_all_scrapers():
    p(SEP2)
    p("  TRINETRA / VERISIGNAL - SCRAPER PIPELINE TEST")
    p(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    p(SEP2)

    all_items = []
    scraper_results = {}

    for name, fn in SCRAPERS:
        p(f"\n{SEP}")
        p(f"  SCRAPER: {name}")
        p(SEP)
        try:
            items = fn()
            scraper_results[name] = len(items)
            all_items.extend(items)

            if items:
                for i, item in enumerate(items, 1):
                    title     = item.get("title", "")[:90]
                    src       = item.get("source_name", "")
                    is_scheme = "  [SCHEME]" if item.get("is_scheme") else ""
                    url       = item.get("source_url", "")[:70]
                    p(f"  {i:02d}.{is_scheme} [{src}] {title}")
                    p(f"       url: {url}")
                p(f"\n  [PASS] {name}: {len(items)} items fetched")
            else:
                p(f"  [ZERO] {name}: 0 items (site may be down or selectors changed)")

        except Exception as e:
            scraper_results[name] = 0
            p(f"  [FAIL] {name} CRASHED: {e}")

    # Push to DB -----------------------------------------------------------
    p(f"\n{SEP2}")
    p("  PUSHING TO MONGODB")
    p(SEP2)
    try:
        new_count = push_items(all_items)
        p(f"\n  Inserted: {new_count} new items (duplicates skipped)")
    except Exception as e:
        p(f"  [FAIL] push_items FAILED: {e}")
        new_count = 0

    # Query DB for counts --------------------------------------------------
    p(f"\n{SEP2}")
    p("  MONGODB COLLECTION COUNTS")
    p(SEP2)
    try:
        db = _get_db()
        counts = {
            "incidents":    db["incidents"].count_documents({}),
            "schemes":      db["schemes"].count_documents({}),
            "scraped_feed": db["scraped_feed"].count_documents({}),
            "scraper_meta": db["scraper_meta"].count_documents({}),
            "scraper_logs": db["scraper_logs"].count_documents({}),
        }
        scraped_incidents = db["incidents"].count_documents({"source": "scraped"})
        for col, cnt in counts.items():
            tag = f"  ({scraped_incidents} from scraper)" if col == "incidents" else ""
            p(f"  {col:<20} {cnt:>6} documents{tag}")

        # Sample scheme titles
        p("\n  Latest schemes in DB:")
        for s in db["schemes"].find({}).sort("scraped_at", -1).limit(5):
            p(f"    [{s.get('state','?')}] {s.get('title','?')[:70]}")

        # Sample scraped incidents
        p("\n  Latest scraped incidents in DB:")
        for inc in db["incidents"].find({"source": "scraped"}).sort("created_at", -1).limit(5):
            sev = inc.get("severity", "?")
            p(f"    [{sev}] {inc.get('title','?')[:70]}")

    except Exception as e:
        p(f"  [FAIL] MongoDB query failed: {e}")
        counts = {}

    # PASS/FAIL summary ----------------------------------------------------
    p(f"\n{SEP2}")
    p("  SUMMARY")
    p(SEP2)
    total_scraped = sum(scraper_results.values())
    passed = [n for n, c in scraper_results.items() if c > 0]
    failed = [n for n, c in scraper_results.items() if c == 0]

    for name, cnt in scraper_results.items():
        status = "[PASS]" if cnt > 0 else "[ZERO]"
        p(f"  {status}  {name:<20} {cnt} items")

    p()
    p(f"  Total scraped    : {total_scraped} items")
    p(f"  New DB inserts   : {new_count}")
    p(f"  Scrapers passing : {len(passed)}/{len(SCRAPERS)}")

    if failed:
        p(f"\n  Zero-result scrapers (site may be down or bot-blocked):")
        for n in failed:
            p(f"     - {n}")

    schemes_ok = counts.get("schemes", 0) > 0
    incs_ok    = counts.get("incidents", 0) > 0
    p(f"\n  schemes collection  : {'[OK] HAS DATA' if schemes_ok else '[!!] EMPTY - re-run pipeline'}")
    p(f"  incidents collection: {'[OK] HAS DATA' if incs_ok else '[!!] EMPTY - re-run pipeline'}")
    p(SEP2)

    overall = "[OK] ALL SYSTEMS OPERATIONAL" if (schemes_ok and incs_ok) else "[!!] SOME ISSUES - see above"
    p(f"\n  RESULT: {overall}")
    p(SEP2)


if __name__ == "__main__":
    test_all_scrapers()
