"""Goal-specific weekly schedules (no fixed clock times)."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

LEGACY_GOAL_IDS = {
    "weight": "weight_loss",
    "active": "daily_fitness",
    "flexibility": "height",
}


@lru_cache(maxsize=1)
def _load_catalog() -> dict[str, Any]:
    path = Path(__file__).resolve().parents[3] / "shared" / "goal_weekly_plans.json"
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def resolve_plan_variant_key(fitness_level: str, daily_minutes: int) -> str:
    level = (fitness_level or "Beginner").strip().lower()
    if level not in {"beginner", "intermediate", "advanced"}:
        level = "beginner"
    duration = "60" if daily_minutes > 45 else "30"
    return f"{level}_{duration}"


def _variant_fallback_keys(fitness_level: str, daily_minutes: int) -> list[str]:
    level = (fitness_level or "Beginner").strip().lower()
    if level not in {"beginner", "intermediate", "advanced"}:
        level = "beginner"
    duration = "60" if daily_minutes > 45 else "30"
    keys = [f"{level}_{duration}"]
    if level == "advanced":
        keys.append(f"intermediate_{duration}")
    if level in {"advanced", "intermediate"}:
        keys.append(f"beginner_{duration}")
    return keys


def _resolve_template_days(template: dict[str, Any], answers: dict[str, Any]) -> list[Any]:
    daily_minutes = int(answers.get("daily_minutes", 30))
    variants = template.get("variants")
    if isinstance(variants, dict):
        for variant_key in _variant_fallback_keys(
            answers.get("fitness_level", "Beginner"),
            daily_minutes,
        ):
            if variant_key in variants:
                return variants[variant_key]["days"]
    if "days" in template:
        return template["days"]
    return []


def get_goal_weekly_plan(goal: str) -> dict[str, Any] | None:
    catalog = _load_catalog()
    if goal in catalog:
        return catalog[goal]
    mapped = LEGACY_GOAL_IDS.get(goal)
    if mapped and mapped in catalog:
        return catalog[mapped]
    return None


def build_weekly_plan_response(answers: dict[str, Any]) -> dict[str, Any] | None:
    template = get_goal_weekly_plan(answers["goal"])
    if not template:
        return None
    days = _resolve_template_days(template, answers)
    if not days:
        return None
    return {
        "fitness_level": answers["fitness_level"],
        "goal": answers["goal"],
        "daily_minutes": answers["daily_minutes"],
        "preferred_windows": answers["preferred_windows"],
        "focus_areas": answers["focus_areas"],
        "schedule": [],
        "weekly_schedule": days,
        "plan_layout": "weekly",
        "plan_headline": template["headline"],
        "plan_subtitle": template["subtitle"],
        "source": "template",
    }
