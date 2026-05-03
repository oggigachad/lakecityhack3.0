from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from models.schemas import VeriAnalyzeRequest, VeriAnalyzeResponse
from api.auth import get_current_user
import logging

logger = logging.getLogger("trinetra.veri")

router = APIRouter(prefix="/veri", tags=["veri-ai"])


@router.post("/analyze", response_model=VeriAnalyzeResponse)
async def analyze_text(body: VeriAnalyzeRequest, current_user=Depends(get_current_user)):
    from veri_ai.pipeline import analyze
    result = analyze(body.text)
    result["source"] = body.source
    return result


# ── KodeKloud Claude Chat ─────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

class ChatResponse(BaseModel):
    reply: str
    model: str

SYSTEM_PROMPT = """You are VeriAI, the embedded crisis intelligence assistant for TriNetra — India's real-time crisis incident management platform. You specialize in:
- Indian disaster management (NDMA, NDRF, IMD guidelines)
- Crisis response protocols (flood, cyclone, earthquake, fire, medical emergencies)
- Interpreting TriNetra incident severity and classification data
- Government disaster relief schemes (NDRF grants, SDRF, PM relief fund)

If the user asks to navigate to a page (e.g., map, report, news, settings, schemes, home/landing page) or wants to logout, or check where disasters are occurring (map), you MUST include a special tag at the very beginning of your response:
[REDIRECT:/path] for pages (e.g. [REDIRECT:/map], [REDIRECT:/schemes], [REDIRECT:/report], [REDIRECT:/news], [REDIRECT:/settings], [REDIRECT:/])
[REDIRECT:LOGOUT] if they want to log out.
Then, provide a brief message like 'Redirecting you to the requested page...'

Answer concisely, factually, and compassionately. Stay within the crisis/emergency/disaster domain. Cite NDMA/IMD sources when possible."""


@router.post("/chat", response_model=ChatResponse)
async def veri_chat(body: ChatRequest, current_user=Depends(get_current_user)):
    """
    Proxy to KodeKloud Claude Sonnet 4.6 API for VeriAI chatbot responses.
    """
    try:
        from openai import OpenAI

        client = OpenAI(
            api_key="sk-9-GlN_uS0ogQ5MooJwkOew",
            base_url="https://api.ai.kodekloud.com/v1"
        )

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for m in body.messages:
            messages.append({"role": m.role, "content": m.content})

        response = client.chat.completions.create(
            model="claude-sonnet-4-6",
            messages=messages,
            max_tokens=512,
            temperature=0.4,
        )
        reply = response.choices[0].message.content
        return {"reply": reply, "model": "claude-sonnet-4-6"}

    except Exception as e:
        logger.error(f"VeriAI chat error: {e}")
        raise HTTPException(status_code=502, detail=f"VeriAI LLM unavailable: {str(e)}")
