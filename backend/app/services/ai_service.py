# ============================================================
# backend/app/services/ai_service.py
# AI provider abstraction + OpenAI implementation
# ============================================================

from __future__ import annotations
import time
import json
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any
from loguru import logger
from tenacity import (
    retry, stop_after_attempt, wait_exponential,
    retry_if_exception_type, before_sleep_log
)
import logging
import openai
from openai import AsyncOpenAI, RateLimitError, APITimeoutError, APIConnectionError

from schemas.scan_schema import ParsedQuestion, AIAnswer, AIAnswerResponse


# ── Abstract base provider ────────────────────────────────────

class BaseAIProvider(ABC):
    """
    Abstract AI provider. Subclass this to add new providers
    (Gemini, Anthropic, local LLMs, etc.)
    """

    @abstractmethod
    async def answer_questions(
        self,
        questions: List[ParsedQuestion],
        model: str,
        timeout_seconds: int
    ) -> AIAnswerResponse:
        ...

    @abstractmethod
    async def test_connection(self, model: str, timeout_seconds: int = 10) -> Dict[str, Any]:
        ...


# ── OpenAI provider ───────────────────────────────────────────

class OpenAIProvider(BaseAIProvider):
    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type((RateLimitError, APIConnectionError)),
        before_sleep=before_sleep_log(logging.getLogger("ai_service"), logging.WARNING)
    )
    async def answer_questions(
        self,
        questions: List[ParsedQuestion],
        model: str = "gpt-4o-mini",
        timeout_seconds: int = 30
    ) -> AIAnswerResponse:
        """Send questions to OpenAI and get structured answers."""

        if not questions:
            return AIAnswerResponse(error="No questions provided")

        # Build prompt
        system_prompt = """You are an expert tutor analyzing multiple-choice questions (MCQs).
For each question, you must:
1. Identify the most accurate correct answer
2. Explain WHY it is correct with clear reasoning
3. Briefly explain why each other option is incorrect
4. Rate your confidence: "high", "medium", or "low"
5. Never fabricate information — if truly uncertain, say so

Respond ONLY with valid JSON in this exact format:
{
  "answers": [
    {
      "question": "The question text",
      "correct_option": "B",
      "correct_answer": "The correct answer text",
      "confidence": "high",
      "explanation": "Explanation of why B is correct...",
      "other_options": {
        "A": "Why A is wrong",
        "C": "Why C is wrong",
        "D": "Why D is wrong"
      },
      "tokens_used": 0
    }
  ]
}"""

        user_content = "Analyze the following MCQ question(s):\n\n"
        for i, q in enumerate(questions, 1):
            user_content += f"Question {i}: {q.question}\n"
            for label, text in q.options.items():
                user_content += f"  {label}. {text}\n"
            user_content += "\n"

        try:
            start = time.monotonic()
            response = await self.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.1,
                max_tokens=2000,
                response_format={"type": "json_object"},
                timeout=timeout_seconds
            )
            latency_ms = int((time.monotonic() - start) * 1000)

            content = response.choices[0].message.content
            if not content:
                return AIAnswerResponse(error="Empty response from AI")

            parsed = json.loads(content)
            answers_raw = parsed.get("answers", [])

            answers = []
            for ans in answers_raw:
                answers.append(AIAnswer(
                    question=ans.get("question", ""),
                    correct_option=ans.get("correct_option", ""),
                    correct_answer=ans.get("correct_answer", ""),
                    confidence=ans.get("confidence", "low"),
                    explanation=ans.get("explanation", ""),
                    other_options=ans.get("other_options", {}),
                    tokens_used=response.usage.total_tokens if response.usage else 0
                ))

            total_tokens = response.usage.total_tokens if response.usage else 0
            logger.info(
                f"[AI] Answered {len(answers)} question(s), "
                f"tokens: {total_tokens}, latency: {latency_ms}ms"
            )

            return AIAnswerResponse(
                answers=answers,
                total_tokens=total_tokens,
                model=model
            )

        except json.JSONDecodeError as e:
            logger.error(f"[AI] JSON parse error: {e}")
            return AIAnswerResponse(error=f"AI returned invalid JSON: {e}")

        except APITimeoutError:
            return AIAnswerResponse(error=f"AI request timed out after {timeout_seconds}s")

        except RateLimitError:
            return AIAnswerResponse(error="OpenAI rate limit exceeded. Please wait and try again.")

        except openai.AuthenticationError:
            return AIAnswerResponse(error="Invalid OpenAI API key. Please check your settings.")

        except Exception as e:
            logger.error(f"[AI] Unexpected error: {e}")
            return AIAnswerResponse(error=str(e))

    async def test_connection(self, model: str = "gpt-4o-mini", timeout_seconds: int = 10) -> Dict[str, Any]:
        """Test API connectivity with a minimal request."""
        try:
            start = time.monotonic()
            response = await self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": "Reply with the word CONNECTED only."}],
                max_tokens=10,
                timeout=timeout_seconds
            )
            latency_ms = int((time.monotonic() - start) * 1000)
            content = response.choices[0].message.content or ""
            return {
                "success": True,
                "model": model,
                "latency_ms": latency_ms,
                "response": content.strip()
            }
        except openai.AuthenticationError:
            return {"success": False, "error": "Invalid API key"}
        except APITimeoutError:
            return {"success": False, "error": f"Connection timed out after {timeout_seconds}s"}
        except Exception as e:
            return {"success": False, "error": str(e)}


# ── Provider factory ──────────────────────────────────────────

def get_provider(provider_name: str, api_key: str) -> BaseAIProvider:
    """
    Factory function. Add new providers here.
    provider_name: 'openai' | 'anthropic' | 'gemini' | ...
    """
    if provider_name == "openai":
        return OpenAIProvider(api_key=api_key)
    # Future: elif provider_name == "anthropic": return AnthropicProvider(api_key=api_key)
    raise ValueError(f"Unknown AI provider: {provider_name}")
