import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uuid
import logging
from pathlib import Path
from apscheduler.schedulers.background import BackgroundScheduler

from core.config import settings
from core.jwt import decode_token
from core.websocket_manager import ws_manager
from db.mongo import create_indexes
from db import mongo
from api import auth, incidents, veri, schemes, scraper as scraper_api

# Add scraper to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scraper"))
from scheduler import safe_pipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("trinetra.backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("TriNetra backend starting — creating MongoDB indexes...")
    create_indexes()
    logger.info("Backend ready.")
    yield
    logger.info("VeriSignal backend shutting down.")


app = FastAPI(
    title="TriNetra API",
    description="Crisis Incident Reporting & Management Platform — Lakecity Hack 3.0",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(incidents.router)
app.include_router(veri.router)
app.include_router(schemes.router)
app.include_router(scraper_api.router)


# ── Health / root ──────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    # Setup Mongo
    mongo.connect()
    
    # Start Scraper in background
    scheduler = BackgroundScheduler(timezone="Asia/Kolkata")
    scheduler.add_job(safe_pipeline, 'interval', minutes=1, id="scraper_pipeline_bg", replace_existing=True)
    scheduler.start()
    print("Background scraper scheduled to run every 1 minute.")

@app.get("/", tags=["health"])
async def root():
    return {
        "service": "VeriSignal API",
        "version": "1.0.0",
        "status": "operational",
        "active_ws_connections": ws_manager.connection_count,
    }


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}


# ── Internal broadcast — called by the scraper process ────────────────────────
@app.post("/internal/broadcast", include_in_schema=False)
async def internal_broadcast(request: Request):
    """
    Called by feed_to_db.py (scraper process) to push new scraped incidents
    to all connected WebSocket clients. Not exposed in /docs.
    """
    try:
        payload = await request.json()
        await ws_manager.broadcast(payload)
        return {"ok": True, "connections": ws_manager.connection_count}
    except Exception as e:
        logger.warning(f"internal/broadcast error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ── WebSocket endpoints ────────────────────────────────────────────────────────
@app.websocket("/ws/incidents")
async def ws_incidents(websocket: WebSocket, token: str = None):
    role = "citizen"
    if token:
        payload = decode_token(token)
        if payload:
            role = payload.get("role", "citizen")

    connection_id = str(uuid.uuid4())
    await ws_manager.connect(websocket, connection_id, role)
    logger.info(f"WS connected: {connection_id} role={role} total={ws_manager.connection_count}")

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(connection_id)
        logger.info(f"WS disconnected: {connection_id} total={ws_manager.connection_count}")


@app.websocket("/ws/alerts")
async def ws_alerts(websocket: WebSocket, token: str = None):
    role = "citizen"
    if token:
        payload = decode_token(token)
        if payload:
            role = payload.get("role", "citizen")

    connection_id = f"alert-{uuid.uuid4()}"
    await ws_manager.connect(websocket, connection_id, role)

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(connection_id)
