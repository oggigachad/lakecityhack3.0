"""
scheduler.py — APScheduler running the full scraper pipeline every 5 minutes.
IntervalTrigger: minutes=5
Starts with scheduler.start() (blocking).
"""
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger
from pipeline import run_pipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("verisignal.scheduler")


def safe_pipeline():
    """Wrapper so scheduler job never crashes the process."""
    try:
        summary = run_pipeline()
        logger.info(f"Scheduled run complete: {summary}")
    except Exception as e:
        logger.error(f"Pipeline error (scheduler will retry in 5 min): {e}")


# ── Build scheduler ────────────────────────────────────────────────────────────
scheduler = BlockingScheduler(timezone="Asia/Kolkata")

scheduler.add_job(
    func=safe_pipeline,
    trigger=IntervalTrigger(minutes=1),
    id="scraper_pipeline",
    name="VeriSignal Full Scraper Pipeline",
    replace_existing=True,
    max_instances=1,         # Prevent overlapping runs
    misfire_grace_time=60,   # Allow up to 60s late start
)

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("VeriSignal Scraper Scheduler starting")
    logger.info("Interval: every 1 minute (Asia/Kolkata)")
    logger.info("=" * 60)

    # Run immediately on start, then every 1 minute
    logger.info("Running initial pipeline on startup...")
    safe_pipeline()

    logger.info("Starting APScheduler (Ctrl+C to stop)...")
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler stopped.")
