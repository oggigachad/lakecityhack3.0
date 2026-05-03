"""
Schemes API — reads from the 'schemes' MongoDB collection.
Items are populated by the scraper pipeline (mp_sdma_scraper fallback schemes
ensure this collection is NEVER empty after first pipeline run).
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from api.auth import get_current_user
from db import mongo

router = APIRouter(prefix="/schemes", tags=["schemes"])


def _ser(doc: dict) -> dict:
    """Serialise a MongoDB document for the frontend."""
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    # Normalise field names so frontend works regardless of scraper version
    if "source_url" in doc and "link" not in doc:
        doc["link"] = doc["source_url"]
    if "raw_text" in doc and "description" not in doc:
        doc["description"] = doc["raw_text"]
    # Remove internal fingerprint from response
    doc.pop("_fingerprint", None)
    return doc


@router.get("/")
async def list_schemes(
    category: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    current_user=Depends(get_current_user),
):
    """
    List government disaster relief schemes.
    Populated by the scraper pipeline every 5 minutes.
    Filters are case-insensitive.
    """
    query: dict = {}
    if category:
        query["category"] = {"$regex": category, "$options": "i"}
    if state:
        query["state"] = {"$regex": state, "$options": "i"}

    results = [
        _ser(doc)
        for doc in mongo.schemes().find(query).sort("scraped_at", -1).limit(limit)
    ]
    return {"data": results, "total": len(results)}
