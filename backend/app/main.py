"""SmartNotes AI — FastAPI application entrypoint.

Phase 2 skeleton: app boots, /health responds, all routers mounted with stubbed routes that
conform to API_CONTRACTS.md. Business logic lands in Phases 4a/4b.

Run: uvicorn app.main:app --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import ai, auth, folders, notes, preferences

app = FastAPI(title="SmartNotes AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(folders.router)
app.include_router(notes.router)
app.include_router(preferences.router)
app.include_router(ai.router)


@app.get("/health", tags=["health"])
def health():
    """Liveness probe (API_CONTRACTS.md §2)."""
    return {"status": "ok"}
