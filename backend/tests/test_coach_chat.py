import asyncio

from app.core.config import settings
from app.services.coach_chat_service import coach_chat


def test_coach_chat_without_api_key(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")
    result = asyncio.run(coach_chat(message="I feel sore after squats", history=[]))
    assert "GEMINI_API_KEY" in result["reply"]
