"""AI routes — REQ-AIA-*, REQ-REV-*, REQ-CPMT-*, REQ-NP-*. Stubs in Phase 2; wired in Phase 4b.

Routes (see API_CONTRACTS.md §7): POST /ai/transform, POST /ai/revise,
POST /ai/notepilot (SSE stream).
"""
from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/ai", tags=["ai"])

_NOT_IMPL = HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail="Wired in Phase 4b.")


@router.post("/transform")
def transform():
    raise _NOT_IMPL


@router.post("/revise")
def revise():
    raise _NOT_IMPL


@router.post("/notepilot")
def notepilot():
    raise _NOT_IMPL
