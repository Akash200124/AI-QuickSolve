# ============================================================
# backend/app/models/scan.py – SQLAlchemy ORM model for scans
# ============================================================

import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from database.db import Base


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    options_json: Mapped[str] = mapped_column(Text, default="{}")
    correct_option: Mapped[str] = mapped_column(String(10), default="")
    correct_answer: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[str] = mapped_column(String(20), default="")
    explanation: Mapped[str] = mapped_column(Text, default="")
    other_options_json: Mapped[str] = mapped_column(Text, default="{}")
    model: Mapped[str] = mapped_column(String(100), default="")
    processing_ms: Mapped[int] = mapped_column(Integer, default=0)
    ocr_confidence: Mapped[float] = mapped_column(Float, default=0.0)
