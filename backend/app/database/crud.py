# ============================================================
# backend/app/database/crud.py – Database CRUD operations
# ============================================================

import json
from datetime import datetime
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, desc
from models.scan import Scan
from schemas.scan_schema import HistoryRecord


async def create_scan(
    db: AsyncSession,
    id: str,
    question: str,
    options: dict,
    correct_option: str,
    correct_answer: str,
    confidence: str,
    explanation: str,
    other_options: dict,
    model: str,
    processing_ms: int,
    ocr_confidence: float
) -> Scan:
    scan = Scan(
        id=id,
        timestamp=datetime.utcnow(),
        question=question,
        options_json=json.dumps(options),
        correct_option=correct_option,
        correct_answer=correct_answer,
        confidence=confidence,
        explanation=explanation,
        other_options_json=json.dumps(other_options),
        model=model,
        processing_ms=processing_ms,
        ocr_confidence=ocr_confidence
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)
    return scan


async def get_scans(
    db: AsyncSession,
    page: int = 0,
    page_size: int = 50
) -> tuple[List[Scan], int]:
    count_result = await db.execute(select(func.count()).select_from(Scan))
    total = count_result.scalar() or 0

    result = await db.execute(
        select(Scan)
        .order_by(desc(Scan.timestamp))
        .offset(page * page_size)
        .limit(page_size)
    )
    scans = list(result.scalars().all())
    return scans, total


async def search_scans(
    db: AsyncSession,
    query: str,
    limit: int = 100
) -> List[Scan]:
    q = f"%{query}%"
    result = await db.execute(
        select(Scan)
        .where(
            Scan.question.ilike(q) |
            Scan.correct_answer.ilike(q) |
            Scan.explanation.ilike(q)
        )
        .order_by(desc(Scan.timestamp))
        .limit(limit)
    )
    return list(result.scalars().all())


async def delete_scan(db: AsyncSession, scan_id: str) -> bool:
    result = await db.execute(delete(Scan).where(Scan.id == scan_id))
    await db.commit()
    return result.rowcount > 0


async def clear_all_scans(db: AsyncSession) -> int:
    result = await db.execute(delete(Scan))
    await db.commit()
    return result.rowcount


async def get_stats(db: AsyncSession) -> dict:
    total = (await db.execute(select(func.count()).select_from(Scan))).scalar() or 0
    successful = (
        await db.execute(
            select(func.count()).select_from(Scan).where(Scan.correct_option != "")
        )
    ).scalar() or 0
    avg_ms = (
        await db.execute(select(func.avg(Scan.processing_ms)).select_from(Scan))
    ).scalar() or 0

    return {
        "total_scans": total,
        "successful_scans": successful,
        "total_questions_processed": total,
        "tokens_used": 0,
        "avg_processing_ms": float(avg_ms)
    }


def scan_to_dict(scan: Scan) -> dict:
    return {
        "id": scan.id,
        "timestamp": scan.timestamp.isoformat(),
        "question": scan.question,
        "options": json.loads(scan.options_json or "{}"),
        "correct_option": scan.correct_option,
        "correct_answer": scan.correct_answer,
        "confidence": scan.confidence,
        "explanation": scan.explanation,
        "model": scan.model,
        "processing_ms": scan.processing_ms,
        "ocr_confidence": scan.ocr_confidence
    }
