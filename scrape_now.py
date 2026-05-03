# ============================================================
#  TriNetra — Run All Scrapers Once (on demand)
#  Usage:  python scrape_now.py
#  Runs the full pipeline immediately (all 14 scrapers).
# ============================================================
import sys
import os
from pathlib import Path

# Ensure scraper package is importable
ROOT = Path(__file__).parent
SCRAPER_DIR = ROOT / "scraper"
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(SCRAPER_DIR))

import logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

from pipeline import run_pipeline

if __name__ == "__main__":
    print("=" * 60)
    print("  TriNetra — Manual Scrape NOW")
    print("  Running all 14 scrapers once...")
    print("=" * 60)
    summary = run_pipeline()
    total = sum(summary.values())
    print("=" * 60)
    print(f"  DONE — {total} items scraped across {len(summary)} sources")
    print("=" * 60)
