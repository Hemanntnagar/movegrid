import asyncio

from app.core.config import settings
from app.services.plan_generation_service import generate_fitness_plan


def test_generate_fitness_plan_without_api_key(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")
    result = asyncio.run(
        generate_fitness_plan(
            {
                "fitness_level": "Beginner",
                "goal": "active",
                "daily_minutes": 30,
                "preferred_windows": ["Morning"],
                "focus_areas": ["Walking", "Core"],
            }
        )
    )
    assert result["fitness_level"] == "Beginner"
    assert len(result["schedule"]) >= 2
    assert sum(slot["duration"] for slot in result["schedule"]) == 30
    assert result["source"] == "personalized"
