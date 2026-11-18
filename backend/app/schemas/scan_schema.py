# ============================================================
# backend/app/schemas/scan_schema.py – Pydantic request/response models
# ============================================================

from __future__ import annotations
from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field


# ── OCR Request ──────────────────────────────────────────────

class OCRRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded PNG screenshot")
    language: str = Field(default="eng", description="Tesseract language code")


class ParsedOption(BaseModel):
    label: str    # A, B, C, D or True/False
    text: str


class ParsedQuestion(BaseModel):
    question_number: Optional[int] = None
    question: str
    options: Dict[str, str] = {}
    question_type: str = "mcq"  # mcq | true_false | multi_select | unknown
    is_complete: bool = True
    raw_text: str = ""


class OCRResponse(BaseModel):
    questions: List[ParsedQuestion] = []
    raw_text: str = ""
    avg_confidence: float = 0.0
    low_confidence: bool = False
    warning: Optional[str] = None
    error: Optional[str] = None


# ── AI Request / Response ────────────────────────────────────

class AIAnswerRequest(BaseModel):
    questions: List[ParsedQuestion]
    api_key: str = Field(..., description="OpenAI API key (never stored)")
    model: str = Field(default="gpt-4o-mini")
    max_retries: int = Field(default=3, ge=1, le=10)
    timeout_seconds: int = Field(default=30, ge=5, le=120)


class AIAnswer(BaseModel):
    question: str
    correct_option: str
    correct_answer: str
    confidence: str  # high | medium | low
    explanation: str
    other_options: Dict[str, str] = {}
    tokens_used: int = 0


class AIAnswerResponse(BaseModel):
    answers: List[AIAnswer] = []
    total_tokens: int = 0
    model: str = ""
    error: Optional[str] = None


class AITestRequest(BaseModel):
    api_key: str
    model: str = "gpt-4o-mini"


class AITestResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    model: str = ""
    latency_ms: int = 0


# ── History ──────────────────────────────────────────────────

class HistoryRecord(BaseModel):
    id: str
    timestamp: datetime
    question: str
    options: Dict[str, str]
    correct_option: str
    correct_answer: str
    confidence: str
    explanation: str
    model: str
    processing_ms: int
    ocr_confidence: float

    model_config = {"from_attributes": True}


class HistoryListResponse(BaseModel):
    records: List[HistoryRecord]
    total: int
    page: int
    page_size: int


class StatsResponse(BaseModel):
    total_scans: int
    successful_scans: int
    total_questions_processed: int
    tokens_used: int
    avg_processing_ms: float
