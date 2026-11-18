# ============================================================
# backend/app/api/routes/ai.py – AI answer endpoints
# ============================================================

from fastapi import APIRouter, Depends, HTTPException
from schemas.scan_schema import (
    AIAnswerRequest, AIAnswerResponse,
    AITestRequest, AITestResponse
)
from services.ai_service import get_provider
from api.deps import verify_secret

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/answer", response_model=AIAnswerResponse)
async def answer_questions(
    request: AIAnswerRequest,
    _: None = Depends(verify_secret)
) -> AIAnswerResponse:
    """
    Send parsed MCQ questions to the configured AI provider.
    Returns structured answers with explanations.
    """
    if not request.api_key:
        raise HTTPException(status_code=400, detail="api_key is required")

    if not request.questions:
        raise HTTPException(status_code=400, detail="No questions provided")

    provider = get_provider("openai", api_key=request.api_key)
    result = await provider.answer_questions(
        questions=request.questions,
        model=request.model,
        timeout_seconds=request.timeout_seconds
    )
    return result


@router.post("/test", response_model=AITestResponse)
async def test_api(
    request: AITestRequest,
    _: None = Depends(verify_secret)
) -> AITestResponse:
    """
    Test AI provider connectivity.
    Returns success status and latency.
    """
    if not request.api_key:
        return AITestResponse(success=False, error="API key is required")

    provider = get_provider("openai", api_key=request.api_key)
    result = await provider.test_connection(model=request.model)
    return AITestResponse(
        success=result.get("success", False),
        error=result.get("error"),
        model=result.get("model", ""),
        latency_ms=result.get("latency_ms", 0)
    )
