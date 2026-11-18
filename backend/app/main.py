# ============================================================
# backend/app/main.py – FastAPI application entry point
# Started by Electron as a child process
# ============================================================

import os
import sys
import signal
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
import uvicorn

from config.settings import get_settings
from database.db import init_db
from api.routes import ocr, ai, history

settings = get_settings()

# ── Logging setup ─────────────────────────────────────────────
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}",
    level=settings.log_level,
    colorize=True
)
logger.add(
    "logs/backend.log",
    rotation="10 MB",
    retention="7 days",
    level="DEBUG",
    encoding="utf-8"
)


# ── App lifespan ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 50)
    logger.info("AI QuickSolve Backend starting…")
    logger.info(f"Port: {settings.backend_port}")
    logger.info(f"Tesseract: {settings.tesseract_cmd}")
    logger.info("=" * 50)

    # Initialize database
    await init_db()
    logger.info("Database initialized")

    yield

    logger.info("AI QuickSolve Backend shutting down")


# ── App creation ──────────────────────────────────────────────

app = FastAPI(
    title="AI QuickSolve Backend",
    description="OCR and AI processing service for AI QuickSolve",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None,  # Disable in production
    redoc_url=None
)

# CORS: only allow localhost (Electron renderer)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://localhost:{settings.backend_port}",
        "http://127.0.0.1:*",
        "file://*"
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Secret-Token"]
)


# ── Global error handler ──────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )


# ── Routes ────────────────────────────────────────────────────

app.include_router(ocr.router)
app.include_router(ai.router)
app.include_router(history.router)


@app.get("/health")
async def health():
    """Health check endpoint polled by Electron on startup."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "port": settings.backend_port
    }


# ── Entry point ───────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("BACKEND_PORT", settings.backend_port))

    # Handle graceful shutdown signals
    def handle_signal(sig, frame):
        logger.info(f"Received signal {sig}, shutting down…")
        sys.exit(0)

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    # Create logs directory
    os.makedirs("logs", exist_ok=True)

    logger.info(f"Starting uvicorn on port {port}")
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_level="warning",
        access_log=False,
        workers=1
    )
