from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: Literal["citizen", "responder", "admin"] = "citizen"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(UserBase):
    id: str
    created_at: datetime
    alert_radius: float = 10.0
    notifications: dict = Field(default_factory=dict)

class UserSettingsUpdate(BaseModel):
    alert_radius: Optional[float] = None
    notifications: Optional[dict] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class LocationModel(BaseModel):
    lat: float
    lng: float

class IncidentCreate(BaseModel):
    title: str
    description: str
    type: Literal["flood", "fire", "conflict", "medical", "infrastructure", "cyclone", "earthquake", "other"] = "other"
    location: LocationModel
    severity: Optional[Literal["LOW", "MEDIUM", "CRITICAL"]] = None

class IncidentOut(BaseModel):
    id: str
    title: str
    description: str
    type: str
    severity: str
    sentiment: str
    confidence: float
    is_verified: bool
    source: str
    location: LocationModel
    status: str
    reported_by: Optional[str]
    assigned_to: Optional[str]
    created_at: datetime
    updated_at: datetime

class IncidentStatusUpdate(BaseModel):
    status: Literal["open", "in_progress", "resolved", "closed"]
    note: Optional[str] = ""
    assigned_to: Optional[str] = None

class VeriAnalyzeRequest(BaseModel):
    text: str
    source: str = "user_reported"

class VeriAnalyzeResponse(BaseModel):
    severity: Literal["LOW", "MEDIUM", "CRITICAL"]
    sentiment: Literal["negative", "neutral", "positive"]
    crisis_type: str
    confidence: float
    is_verified: bool
    source: str
    label: str  # "real" / "fake"

class SchemeOut(BaseModel):
    id: str
    title: str
    description: str
    category: str
    state: str
    link: str
    scraped_at: datetime

class AuditLogOut(BaseModel):
    id: str
    incident_id: str
    action: str
    performed_by: str
    timestamp: datetime
    note: str

class ScrapedFeedOut(BaseModel):
    id: str
    raw_text: str
    source_url: str
    source_name: str
    scraped_at: datetime
    veri_analysis: dict
