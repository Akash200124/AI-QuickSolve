# ============================================================
# backend/app/api/routes/history.py – History CRUD endpoint
# (Provides REST API for history if needed; primary storage is
#  managed by Electron's electron-store in the main process)
# ============================================================

from fastapi import APIRouter, Depends
from api.deps import verify_secret
from schemas.scan_schema import StatsResponse

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("/stats", response_model=StatsResponse)
async def get_stats(_: None = Depends(verify_secret)) -> StatsResponse:
    """
    Returns basic usage statistics.
    Primary history storage is in Electron's electron-store (main process),
    so this endpoint returns a minimal response.
    """
    return StatsResponse(
        total_scans=0,
        successful_scans=0,
        total_questions_processed=0,
        tokens_used=0,
        avg_processing_ms=0.0
    )
