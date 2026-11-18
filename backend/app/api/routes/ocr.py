# ============================================================
# backend/app/api/routes/ocr.py – OCR endpoint
# ============================================================

from fastapi import APIRouter, Depends, HTTPException
from schemas.scan_schema import OCRRequest, OCRResponse
from services.ocr_service import OCRService
from api.deps import verify_secret

router = APIRouter(prefix="/api/ocr", tags=["ocr"])
ocr_service = OCRService()


@router.post("/process", response_model=OCRResponse)
async def process_image(
    request: OCRRequest,
    _: None = Depends(verify_secret)
) -> OCRResponse:
    """
    Accepts a base64-encoded PNG screenshot.
    Returns extracted questions, raw text, and OCR confidence.
    """
    if not request.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 is required")

    result = await ocr_service.process(
        image_base64=request.image_base64,
        language=request.language
    )
    return result
