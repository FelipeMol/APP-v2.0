"""
FastAPI server — ponto de entrada da IA Copilot.
Roda com: uvicorn main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from config import settings
from auth import verify_token_and_tenant
from agent import run_chat
from db import init_pool, close_pool


# ── Lifecycle ─────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()


app = FastAPI(
    title="IA Copilot — Controle de Obras",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — permite o frontend acessar
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────
class HistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[HistoryMessage] = []
    tenant_id: Optional[int] = None  # fallback se não vier no header


class ChatResponse(BaseModel):
    response: str
    tenant_id: int


# ── Endpoints ─────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-copilot"}


@app.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    auth: dict = Depends(verify_token_and_tenant),
):
    tenant_id = auth["tenant_id"]

    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Mensagem vazia.")

    history = [{"role": m.role, "content": m.content} for m in body.history]

    response_text = await run_chat(
        message=body.message,
        history=history,
        tenant_id=tenant_id,
    )

    return ChatResponse(response=response_text, tenant_id=tenant_id)


# ── Entrypoint direto ─────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
