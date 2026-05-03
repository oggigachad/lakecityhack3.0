from pydantic import BaseModel
from typing import Literal

class VeriRequest(BaseModel):
    text: str
    source: str = "user_reported"

class VeriResponse(BaseModel):
    severity: Literal["LOW", "MEDIUM", "CRITICAL"]
    sentiment: Literal["negative", "neutral", "positive"]
    crisis_type: str
    confidence: float
    is_verified: bool
    source: str
    label: Literal["real", "fake"]
