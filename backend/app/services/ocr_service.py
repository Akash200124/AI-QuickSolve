# ============================================================
# backend/app/services/ocr_service.py
# Tesseract-based OCR with pytesseract
# ============================================================

import pytesseract
from pytesseract import Output
import numpy as np
from PIL import Image
from loguru import logger
from config.settings import get_settings
from services.image_processing import ImageProcessor
from schemas.scan_schema import OCRResponse
from services.question_parser import QuestionParser

settings = get_settings()
image_processor = ImageProcessor()
question_parser = QuestionParser()


class OCRService:
    def __init__(self):
        # Set Tesseract executable path
        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd

    async def process(self, image_base64: str, language: str = "eng") -> OCRResponse:
        """
        Full OCR pipeline: preprocess → extract → parse → return structured output.
        """
        try:
            # 1. Preprocess image
            logger.info("[OCR] Preprocessing image…")
            pil_image = image_processor.preprocess_to_pil(image_base64)

            # 2. Run Tesseract with detailed data for confidence scoring
            logger.info("[OCR] Running Tesseract…")
            lang = language or settings.ocr_language

            # Get detailed word-level data for confidence
            data = pytesseract.image_to_data(
                pil_image,
                lang=lang,
                output_type=Output.DICT,
                config='--psm 6 --oem 3'
            )

            # 3. Calculate confidence
            confidences = [
                int(c) for c in data['conf']
                if c != '-1' and int(c) > 0
            ]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            low_confidence = avg_confidence < 60.0

            # 4. Extract full text (preserving layout)
            raw_text = pytesseract.image_to_string(
                pil_image,
                lang=lang,
                config='--psm 6 --oem 3'
            ).strip()

            logger.info(f"[OCR] Extracted {len(raw_text)} chars, confidence: {avg_confidence:.1f}%")

            if not raw_text:
                return OCRResponse(
                    raw_text="",
                    avg_confidence=0.0,
                    low_confidence=True,
                    warning="No text detected in the screenshot"
                )

            # 5. Parse questions from text
            questions = question_parser.parse(raw_text)

            warning = None
            if low_confidence:
                warning = f"OCR confidence is low ({avg_confidence:.0f}%). Results may be inaccurate."
            if not questions:
                warning = (warning or "") + " No MCQ questions detected in the captured text."

            return OCRResponse(
                questions=questions,
                raw_text=raw_text,
                avg_confidence=round(avg_confidence, 2),
                low_confidence=low_confidence,
                warning=warning if warning else None
            )

        except Exception as e:
            logger.error(f"[OCR] Error: {e}")
            return OCRResponse(error=str(e))
