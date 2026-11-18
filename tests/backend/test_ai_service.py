# ============================================================
# tests/backend/test_ai_service.py – Tests with mock OpenAI
# ============================================================

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.ai_service import OpenAIProvider, get_provider
from app.schemas.scan_schema import ParsedQuestion


MOCK_QUESTION = ParsedQuestion(
    question="What is machine learning?",
    options={
        "A": "Programming manually",
        "B": "Learning patterns from data",
        "C": "Database management",
        "D": "Network communication"
    },
    question_type="mcq",
    is_complete=True,
    raw_text=""
)

MOCK_AI_RESPONSE = {
    "answers": [{
        "question": "What is machine learning?",
        "correct_option": "B",
        "correct_answer": "Learning patterns from data",
        "confidence": "high",
        "explanation": "Machine learning allows computers to learn from data.",
        "other_options": {
            "A": "This describes traditional programming.",
            "C": "This relates to databases.",
            "D": "This relates to networking."
        }
    }]
}


@pytest.mark.asyncio
async def test_openai_provider_success():
    """Test successful AI answer with mock response."""
    with patch('app.services.ai_service.AsyncOpenAI') as mock_openai_cls:
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client

        # Set up mock response
        mock_message = MagicMock()
        mock_message.content = '{"answers": [{"question": "What is machine learning?", "correct_option": "B", "correct_answer": "Learning patterns from data", "confidence": "high", "explanation": "Machine learning allows computers to learn from data.", "other_options": {"A": "Traditional programming", "C": "Databases", "D": "Networking"}}]}'

        mock_choice = MagicMock()
        mock_choice.message = mock_message

        mock_usage = MagicMock()
        mock_usage.total_tokens = 150

        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        mock_response.usage = mock_usage

        mock_client.chat = MagicMock()
        mock_client.chat.completions = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

        provider = OpenAIProvider(api_key="sk-test")
        result = await provider.answer_questions(
            questions=[MOCK_QUESTION],
            model="gpt-4o-mini",
            timeout_seconds=30
        )

        assert result.error is None
        assert len(result.answers) == 1
        assert result.answers[0].correct_option == "B"
        assert result.answers[0].confidence == "high"


@pytest.mark.asyncio
async def test_openai_provider_invalid_key():
    """Test that invalid API key returns error."""
    with patch('app.services.ai_service.AsyncOpenAI') as mock_openai_cls:
        import openai
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client
        mock_client.chat.completions.create = AsyncMock(
            side_effect=openai.AuthenticationError("Invalid API key", response=MagicMock(), body={})
        )

        provider = OpenAIProvider(api_key="sk-invalid")
        result = await provider.answer_questions(
            questions=[MOCK_QUESTION],
            model="gpt-4o-mini",
            timeout_seconds=30
        )

        assert result.error is not None
        assert 'Invalid' in result.error or 'API key' in result.error


def test_get_provider_openai():
    """Test provider factory."""
    p = get_provider("openai", "sk-test")
    assert isinstance(p, OpenAIProvider)


def test_get_provider_unknown():
    """Test factory raises for unknown provider."""
    with pytest.raises(ValueError, match="Unknown AI provider"):
        get_provider("unknown_provider", "key")


@pytest.mark.asyncio
async def test_empty_questions():
    """Test that empty question list returns error."""
    provider = OpenAIProvider(api_key="sk-test")
    result = await provider.answer_questions(
        questions=[],
        model="gpt-4o-mini",
        timeout_seconds=30
    )
    assert result.error is not None
