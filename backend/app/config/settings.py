# ============================================================
# backend/app/config/settings.py
# Pydantic-based configuration management.
# Settings read from environment variables and .env file.
# ============================================================

import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Server
    backend_port: int = Field(default=7845, alias="BACKEND_PORT")
    backend_secret: str = Field(default="", alias="BACKEND_SECRET")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    # OCR
    tesseract_cmd: str = Field(
        default=r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        alias="TESSERACT_CMD"
    )
    ocr_language: str = Field(default="eng", alias="OCR_LANGUAGE")

    # AI
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")

    # Database
    database_url: str = Field(
        default="sqlite+aiosqlite:///./ai_quicksolve.db",
        alias="DATABASE_URL"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
