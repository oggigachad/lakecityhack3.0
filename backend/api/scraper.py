from fastapi import APIRouter, Depends, Query, Request, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from api.auth import get_current_user, require_role
from db import mongo
from datetime import datetime
from typing import Optional
import sys
from pathlib import Path

router = APIRouter(prefix="/scraper", tags=["scraper"])

_optional_bearer = HTTPBearer(auto_error=False)

def _ser(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    for f in ("scraped_at", "last_run"):
        if isinstance(doc.get(f), datetime):
            doc[f] = doc[f].isoformat()
    return doc


@router.get("/status")
async def scraper_status(current_user=Depends(require_role("admin"))):
    """Per-source health — admin only."""
    sources = list(mongo.scraper_meta().find({}))
    for s in sources:
        s["id"] = str(s.pop("_id"))
        for f in ("last_run",):
            if isinstance(s.get(f), datetime):
                s[f] = s[f].isoformat()
    return {"sources": sources}


@router.get("/feed")
async def scraper_feed(
    limit: int = Query(30, le=100),
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_optional_bearer),
):
    """Latest scraped feed — public (no auth required) for landing page ticker."""
    items = [_ser(doc) for doc in mongo.scraped_feed().find({}).sort("scraped_at", -1).limit(limit)]
    return {"data": items, "total": len(items)}


def _run_pipeline_bg():
    """Background thread: run full scraper pipeline."""
    import logging
    logger = logging.getLogger("trinetra.scraper.manual")
    try:
        sys.path.insert(0, str(Path(__file__).parent.parent.parent / "scraper"))
        from pipeline import run_pipeline
        logger.info("Manual scrape triggered via API — starting pipeline...")
        summary = run_pipeline()
        total = sum(summary.values())
        logger.info(f"Manual scrape complete: {total} items across {len(summary)} sources")
    except Exception as e:
        logger.error(f"Manual scrape pipeline error: {e}")


@router.post("/run")
async def scraper_run(
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
):
    """
    Trigger a full scrape NOW in the background.
    Data is pushed to DB and broadcast via WebSocket as each item is saved.
    Accessible by any authenticated user.
    """
    background_tasks.add_task(_run_pipeline_bg)
    return {
        "ok": True,
        "message": "Scrape started in background. Data will appear live via WebSocket.",
    }

