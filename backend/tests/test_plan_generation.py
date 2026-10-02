import asyncio

from app.core.config import settings
from app.services.plan_generation_service import generate_fitness_plan


def test_generate_fitness_plan_without_api_key(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")
    result = asyncio.run(
        generate_fitness_plan(
            {
                "fitness_level": "Beginner",
                "goal": "daily_fitness",
                "daily_minutes": 30,
                "preferred_windows": ["Morning"],
                "focus_areas": ["Walking", "Core"],
            }
        )
    )
    assert result["fitness_level"] == "Beginner"
    assert result["plan_layout"] == "weekly"
    assert result["source"] == "template"
    assert len(result["weekly_schedule"]) == 7
    assert result["weekly_schedule"][0]["day"] == "Monday"
    monday = result["weekly_schedule"][0]
    assert monday["durationLabel"] == "30 min"
    assert any(ex["name"] == "Squat" for ex in monday["exercises"])


def test_generate_fitness_plan_beginner_60_min_variant(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")
    result = asyncio.run(
        generate_fitness_plan(
            {
                "fitness_level": "Beginner",
                "goal": "height",
                "daily_minutes": 60,
                "preferred_windows": ["Morning"],
                "focus_areas": ["Mobility"],
            }
        )
    )
    monday = result["weekly_schedule"][0]
    assert monday["durationLabel"] == "60 min"
    assert monday["exercises"][0]["prescription"] == "10 min"


def test_generate_fitness_plan_intermediate_30_min(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")
    result = asyncio.run(
        generate_fitness_plan(
            {
                "fitness_level": "Intermediate",
                "goal": "weight_gain",
                "daily_minutes": 30,
                "preferred_windows": ["Morning"],
                "focus_areas": ["Strength"],
            }
        )
    )
    monday = result["weekly_schedule"][0]
    assert monday["exercises"][0]["name"] == "Bench press or push-up"
    assert monday["exercises"][0]["prescription"] == "3 × 8"


def test_generate_fitness_plan_intermediate_weight_gain_60_recovery_day(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")
    result = asyncio.run(
        generate_fitness_plan(
            {
                "fitness_level": "Intermediate",
                "goal": "weight_gain",
                "daily_minutes": 60,
                "preferred_windows": ["Morning"],
                "focus_areas": ["Strength"],
            }
        )
    )
    thursday = result["weekly_schedule"][3]
    assert thursday["day"] == "Thursday"
    assert thursday["focus"] == "Recovery"
    assert thursday["exercises"][0]["prescription"] == "30 min"


def test_generate_fitness_plan_advanced_height_hang_prescription(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")
    result = asyncio.run(
        generate_fitness_plan(
            {
                "fitness_level": "Advanced",
                "goal": "height",
                "daily_minutes": 30,
                "preferred_windows": ["Morning"],
                "focus_areas": ["Mobility"],
            }
        )
    )
    monday = result["weekly_schedule"][0]
    assert monday["exercises"][1]["prescription"] == "3 × 60 sec"


def test_generate_fitness_plan_advanced_weight_gain_thursday_recovery(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")
    result = asyncio.run(
        generate_fitness_plan(
            {
                "fitness_level": "Advanced",
                "goal": "weight_gain",
                "daily_minutes": 60,
                "preferred_windows": ["Morning"],
                "focus_areas": ["Strength"],
            }
        )
    )
    thursday = result["weekly_schedule"][3]
    assert thursday["focus"] == "Rest / recovery"


def test_generate_fitness_plan_strength_intermediate_wednesday_rest(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")
    result = asyncio.run(
        generate_fitness_plan(
            {
                "fitness_level": "Intermediate",
                "goal": "strength",
                "daily_minutes": 30,
                "preferred_windows": ["Morning"],
                "focus_areas": ["Strength", "Core"],
            }
        )
    )
    wednesday = result["weekly_schedule"][2]
    assert wednesday["day"] == "Wednesday"
    assert wednesday.get("isRest") is True
