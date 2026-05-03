from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional

from models.schemas import UserCreate, UserLogin, TokenResponse
from core.jwt import create_access_token, verify_token
from core.oauth import get_google_auth_url, exchange_code_for_token, get_google_user_info
from db import mongo

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)


# ── Helpers ────────────────────────────────────────────────────────────────────
def hash_password(pw: str) -> str:
    return pwd_ctx.hash(pw)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

def _user_out(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "citizen"),
        "created_at": user.get("created_at", datetime.utcnow()),
        "alert_radius": user.get("alert_radius", 10.0),
    }

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = verify_token(creds.credentials)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = mongo.users().find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_role(*roles: str):
    def dep(current_user=Depends(get_current_user)):
        if current_user["role"] not in roles:
            raise HTTPException(status_code=403, detail=f"Requires role: {' or '.join(roles)}")
        return current_user
    return dep


# ── Register ───────────────────────────────────────────────────────────────────
@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: UserCreate):
    if mongo.users().find_one({"email": body.email}):
        raise HTTPException(status_code=409, detail="Email already registered")
    if body.role == "admin":
        raise HTTPException(status_code=403, detail="Admin accounts must be seeded via DB")
    doc = {
        "name": body.name,
        "email": body.email,
        "role": body.role,
        "password_hash": hash_password(body.password),
        "google_id": None,
        "created_at": datetime.utcnow(),
        "alert_radius": 10.0,
        "notifications": {"critical": True, "medium": True, "low": False, "scraper": False},
    }
    res = mongo.users().insert_one(doc)
    doc["_id"] = res.inserted_id
    token = create_access_token({"sub": str(res.inserted_id), "role": body.role, "email": body.email})
    return {"access_token": token, "token_type": "bearer", "user": _user_out(doc)}


# ── Login ──────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin):
    user = mongo.users().find_one({"email": body.email})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user["_id"]), "role": user["role"], "email": user["email"]})
    return {"access_token": token, "token_type": "bearer", "user": _user_out(user)}


# ── Google OAuth ───────────────────────────────────────────────────────────────
@router.get("/google")
async def google_login():
    url = get_google_auth_url()
    return {"auth_url": url}

@router.get("/google/callback")
async def google_callback(code: str):
    try:
        token_data = await exchange_code_for_token(code)
        user_info = await get_google_user_info(token_data["access_token"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth failed: {e}")

    user = mongo.users().find_one({"email": user_info["email"]})
    if not user:
        doc = {
            "name": user_info.get("name", ""),
            "email": user_info["email"],
            "role": "citizen",
            "password_hash": None,
            "google_id": user_info["id"],
            "created_at": datetime.utcnow(),
            "alert_radius": 10.0,
            "notifications": {"critical": True, "medium": True, "low": False, "scraper": False},
        }
        res = mongo.users().insert_one(doc)
        doc["_id"] = res.inserted_id
        user = doc
    else:
        mongo.users().update_one({"_id": user["_id"]}, {"$set": {"google_id": user_info["id"]}})

    token = create_access_token({"sub": str(user["_id"]), "role": user["role"], "email": user["email"]})
    return {"access_token": token, "token_type": "bearer", "user": _user_out(user)}


# ── Profile ────────────────────────────────────────────────────────────────────
@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return _user_out(current_user)


# ── Settings update (called by SettingsPage) ───────────────────────────────────
class SettingsUpdate(BaseModel):
    alert_radius: Optional[float] = None
    notifications: Optional[dict] = None

@router.patch("/me/settings")
async def update_settings(body: SettingsUpdate, current_user=Depends(get_current_user)):
    update = {}
    if body.alert_radius is not None:
        if not (0 < body.alert_radius <= 500):
            raise HTTPException(status_code=400, detail="alert_radius must be 1–500 km")
        update["alert_radius"] = body.alert_radius
    if body.notifications is not None:
        update["notifications"] = body.notifications

    if update:
        mongo.users().update_one({"_id": current_user["_id"]}, {"$set": update})

    updated = mongo.users().find_one({"_id": current_user["_id"]})
    return {"message": "Settings updated", "user": _user_out(updated)}
