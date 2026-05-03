from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime
from bson import ObjectId

from models.schemas import IncidentCreate, IncidentStatusUpdate
from api.auth import get_current_user
from core.websocket_manager import ws_manager
from db import mongo

router = APIRouter(prefix="/incidents", tags=["incidents"])

def _serialize(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    if doc.get("reported_by"):
        doc["reported_by"] = str(doc["reported_by"])
    if doc.get("assigned_to"):
        doc["assigned_to"] = str(doc["assigned_to"])
    if doc.get("_feed_id"):
        doc["_feed_id"] = str(doc["_feed_id"])
    # Ensure datetime fields are ISO strings for JSON
    for field in ("created_at", "updated_at", "scraped_at"):
        if isinstance(doc.get(field), datetime):
            doc[field] = doc[field].isoformat()
    return doc


# ─── STATS — must be BEFORE /{incident_id} to avoid shadowing ─────────────────
@router.get("/stats/summary")
async def stats_summary():
    sev_pipeline = [{"$group": {"_id": "$severity", "count": {"$sum": 1}}}]
    severity_dist = {
        doc["_id"]: doc["count"]
        for doc in mongo.incidents().aggregate(sev_pipeline)
        if doc["_id"]
    }
    type_pipeline = [{"$group": {"_id": "$type", "count": {"$sum": 1}}}]
    type_dist = {
        doc["_id"]: doc["count"]
        for doc in mongo.incidents().aggregate(type_pipeline)
        if doc["_id"]
    }
    total = mongo.incidents().count_documents({})
    open_count = mongo.incidents().count_documents({"status": "open"})
    critical = mongo.incidents().count_documents({"severity": "CRITICAL"})
    return {
        "total": total,
        "open": open_count,
        "critical": critical,
        "severity_distribution": severity_dist,
        "type_distribution": type_dist,
    }


@router.post("/report", status_code=201)
async def report_incident(body: IncidentCreate, current_user=Depends(get_current_user)):
    from veri_ai.pipeline import analyze
    analysis = analyze(f"{body.title}. {body.description}")

    now = datetime.utcnow()
    doc = {
        "title": body.title,
        "description": body.description,
        "type": body.type,
        "severity": analysis["severity"],
        "sentiment": analysis["sentiment"],
        "confidence": analysis["confidence"],
        "is_verified": analysis["is_verified"],
        "source": "user_reported",
        "location": body.location.dict(),
        "status": "open",
        "reported_by": current_user["_id"],
        "assigned_to": None,
        "created_at": now,
        "updated_at": now,
        "veri_analysis": analysis,
    }
    res = mongo.incidents().insert_one(doc)
    doc["_id"] = res.inserted_id

    await ws_manager.broadcast({
        "type": "new_incident",
        "payload": {
            "id": str(res.inserted_id),
            "title": body.title,
            "severity": analysis["severity"],
            "type": body.type,
            "location": body.location.dict(),
            "created_at": now.isoformat(),
            "is_verified": analysis["is_verified"],
            "confidence": analysis["confidence"],
        }
    })
    return _serialize(doc)


@router.get("/")
async def list_incidents(
    severity: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    skip: int = Query(0),
    current_user=Depends(get_current_user),
):
    query = {}
    if severity:
        query["severity"] = severity.upper()
    if type:
        query["type"] = type
    if status:
        query["status"] = status
    if source:
        query["source"] = source

    cursor = mongo.incidents().find(query).sort("created_at", -1).skip(skip).limit(limit)
    results = [_serialize(doc) for doc in cursor]
    return {"data": results, "total": mongo.incidents().count_documents(query)}


@router.get("/{incident_id}")
async def get_incident(incident_id: str, current_user=Depends(get_current_user)):
    try:
        doc = mongo.incidents().find_one({"_id": ObjectId(incident_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    if not doc:
        raise HTTPException(status_code=404, detail="Incident not found")

    logs = list(mongo.audit_logs().find({"incident_id": incident_id}).sort("timestamp", -1))
    for log in logs:
        log["id"] = str(log.pop("_id"))
        if isinstance(log.get("timestamp"), datetime):
            log["timestamp"] = log["timestamp"].isoformat()

    result = _serialize(doc)
    result["audit_trail"] = logs
    return result


@router.patch("/{incident_id}/status")
async def update_status(
    incident_id: str,
    body: IncidentStatusUpdate,
    current_user=Depends(get_current_user),
):
    if current_user["role"] not in ("responder", "admin"):
        raise HTTPException(status_code=403, detail="Responders and admins only")
    try:
        oid = ObjectId(incident_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    update_fields = {"status": body.status, "updated_at": datetime.utcnow()}
    if body.assigned_to:
        update_fields["assigned_to"] = body.assigned_to

    result = mongo.incidents().update_one({"_id": oid}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Incident not found")

    mongo.audit_logs().insert_one({
        "incident_id": incident_id,
        "action": f"status_changed_to_{body.status}",
        "performed_by": str(current_user["_id"]),
        "timestamp": datetime.utcnow(),
        "note": body.note or "",
    })

    await ws_manager.broadcast({
        "type": "incident_updated",
        "payload": {"id": incident_id, "status": body.status}
    })
    return {"message": "Updated", "status": body.status}


@router.delete("/{incident_id}")
async def delete_incident(
    incident_id: str,
    current_user=Depends(get_current_user),
):
    try:
        oid = ObjectId(incident_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    doc = mongo.incidents().find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Only allow deletion if user is admin or user reported the incident
    if current_user["role"] != "admin" and str(doc.get("reported_by")) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="You can only delete your own incidents")

    mongo.incidents().delete_one({"_id": oid})
    mongo.audit_logs().delete_many({"incident_id": incident_id})

    await ws_manager.broadcast({
        "type": "incident_deleted",
        "payload": {"id": incident_id}
    })
    return {"message": "Incident removed"}
