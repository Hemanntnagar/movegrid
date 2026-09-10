"""Generate personalized daily fitness timetables from onboarding answers."""
from __future__ import annotations

import json
import re
from typing import Any

import httpx

from app.core.config import settings

FOCUS_AREAS = {"Cardio", "Strength", "Core", "Walking", "Mobility"}
TIME_WINDOWS = {"Morning", "Midday", "Evening"}
GOAL_LABELS = {
    "strength": "Build strength",
    "weight": "Lose weight / burn calories",
    "active": "Stay active daily",
    "flexibility": "Improve flexibility",
}
WINDOW_TIMES = {
    "Morning": ["07:00", "07:30", "08:00"],
    "Midday": ["12:00", "12:30", "13:00"],
    "Evening": ["17:30", "18:00", "18:30", "19:00"],
}

SYSTEM_PROMPT = """You are MOVEGRID's fitness coach. Create a realistic daily movement timetable for one person.
Rules:
- Use only bodyweight or no-equipment activities.
- Match difficulty to the user's fitness level.
- Align exercises with their goal and chosen focus areas.
- Place each slot at a time within their preferred time windows (24h HH:MM).
- Total scheduled minutes should be close to their daily budget (within about 10 minutes).
- Return 2 to 4 slots.
- Categories must be one of: Cardio, Strength, Core, Walking, Mobility.
- Notes should be brief coaching cues (one sentence).
Respond with JSON only, no markdown."""


def _normalize_answers(raw: dict[str, Any]) -> dict[str, Any]:
    level = (raw.get("fitness_level") or raw.get("fitnessLevel") or "Beginner").strip().title()
    if level not in {"Beginner", "Intermediate", "Advanced"}:
        level = "Beginner"
    goal = (raw.get("goal") or "active").strip().lower()
    if goal not in GOAL_LABELS:
        goal = "active"
    try:
        daily_minutes = int(raw.get("daily_minutes") or raw.get("dailyMinutes") or 30)
    except (TypeError, ValueError):
        daily_minutes = 30
    daily_minutes = max(15, min(120, daily_minutes))

    windows_raw = raw.get("preferred_windows") or raw.get("preferredWindows") or ["Morning", "Evening"]
    windows = [w for w in windows_raw if w in TIME_WINDOWS]
    if not windows:
        windows = ["Morning", "Evening"]

    focus_raw = raw.get("focus_areas") or raw.get("focusAreas") or ["Walking", "Strength"]
    focus = [f for f in focus_raw if f in FOCUS_AREAS]
    if not focus:
        focus = ["Walking", "Strength"]

    return {
        "fitness_level": level,
        "goal": goal,
        "daily_minutes": daily_minutes,
        "preferred_windows": windows,
        "focus_areas": focus,
    }


def _user_prompt(answers: dict[str, Any]) -> str:
    return (
        f"Fitness level: {answers['fitness_level']}\n"
        f"Primary goal: {GOAL_LABELS[answers['goal']]}\n"
        f"Daily time budget: {answers['daily_minutes']} minutes\n"
        f"Preferred time windows: {', '.join(answers['preferred_windows'])}\n"
        f"Focus areas: {', '.join(answers['focus_areas'])}\n\n"
        'JSON shape: {"schedule":[{"time":"07:00","title":"...","duration":15,'
        '"category":"Walking","notes":"..."}]}'
    )


def _parse_schedule_payload(content: str) -> list[dict[str, Any]]:
    text = content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    data = json.loads(text)
    if isinstance(data, list):
        schedule = data
    else:
        schedule = data.get("schedule") or data.get("slots") or []
    if not isinstance(schedule, list) or not schedule:
        raise ValueError("empty schedule")
    return schedule


def _coerce_slot(raw: dict[str, Any], index: int, answers: dict[str, Any]) -> dict[str, Any]:
    category = raw.get("category") or answers["focus_areas"][index % len(answers["focus_areas"])]
    if category not in FOCUS_AREAS:
        category = answers["focus_areas"][0]
    window = answers["preferred_windows"][index % len(answers["preferred_windows"])]
    times = WINDOW_TIMES[window]
    time_val = str(raw.get("time") or times[min(index, len(times) - 1)])
    if not re.match(r"^\d{2}:\d{2}$", time_val):
        time_val = times[min(index, len(times) - 1)]
    try:
        duration = int(raw.get("duration") or 15)
    except (TypeError, ValueError):
        duration = 15
    duration = max(5, min(90, duration))
    title = str(raw.get("title") or f"{category} session").strip()[:120]
    notes = str(raw.get("notes") or f"{window} · tailored to your goal.").strip()[:280]
    return {
        "id": f"slot_{index}_{abs(hash(title)) % 10_000_000}",
        "time": time_val,
        "title": title,
        "duration": duration,
        "category": category,
        "notes": notes,
    }


def _balance_durations(slots: list[dict[str, Any]], target: int) -> list[dict[str, Any]]:
    if not slots:
        return slots
    total = sum(s["duration"] for s in slots)
    if total == target or total <= 0:
        return slots
    ratio = target / total
    adjusted = []
    for slot in slots:
        adjusted.append({**slot, "duration": max(5, int(round(slot["duration"] * ratio / 5) * 5))})
    diff = target - sum(s["duration"] for s in adjusted)
    i = 0
    while diff != 0 and adjusted:
        step = 5 if diff > 0 else -5
        idx = i % len(adjusted)
        next_dur = adjusted[idx]["duration"] + step
        if next_dur >= 5:
            adjusted[idx]["duration"] = next_dur
            diff -= step
        i += 1
        if i > 40:
            break
    return sorted(adjusted, key=lambda s: s["time"])


def _fallback_schedule(answers: dict[str, Any]) -> list[dict[str, Any]]:
    """Deterministic personalized plan when no AI key is configured."""
    level = answers["fitness_level"]
    goal = answers["goal"]
    focus = answers["focus_areas"]
    windows = answers["preferred_windows"]
    slot_count = min(4, max(2, len(windows), len(focus) if len(focus) >= 2 else 2))
    per_slot = max(5, answers["daily_minutes"] // slot_count)

    goal_prefix = {
        "strength": "Strength-building",
        "weight": "Fat-burn",
        "active": "Energy",
        "flexibility": "Mobility-focused",
    }[goal]

    slots: list[dict[str, Any]] = []
    for i in range(slot_count):
        area = focus[i % len(focus)]
        window = windows[i % len(windows)]
        times = WINDOW_TIMES[window]
        intensity = {"Beginner": "gentle", "Intermediate": "moderate", "Advanced": "challenging"}[level]
        slots.append(
            {
                "id": f"slot_fb_{i}",
                "time": times[min(i, len(times) - 1)],
                "title": f"{goal_prefix} {area.lower()} block ({intensity})",
                "duration": per_slot,
                "category": area,
                "notes": f"{window} · Scaled for {level.lower()} level toward {GOAL_LABELS[goal].lower()}.",
            }
        )
    return _balance_durations(slots, answers["daily_minutes"])


def _gemini_model_id(raw: str) -> str:
    model = (raw or "gemini-3.8-flash").strip()
    if model.startswith("models/"):
        return model[len("models/") :]
    return model


async def _gemini_schedule(answers: dict[str, Any]) -> list[dict[str, Any]]:
    api_key = (settings.gemini_api_key or "").strip()
    if not api_key:
        return _fallback_schedule(answers)

    model = _gemini_model_id(settings.gemini_model)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": _user_prompt(answers)}]}],
        "generationConfig": {
            "temperature": 0.7,
            "responseMimeType": "application/json",
        },
    }
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                url,
                headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
                json=payload,
            )
        if response.status_code >= 400:
            return _fallback_schedule(answers)
        body = response.json()
        parts = body["candidates"][0]["content"]["parts"]
        content = next((p.get("text", "") for p in parts if p.get("text")), "")
        if not content:
            return _fallback_schedule(answers)
        raw_schedule = _parse_schedule_payload(content)
    except (KeyError, IndexError, json.JSONDecodeError, ValueError, httpx.HTTPError):
        return _fallback_schedule(answers)

    slots = [_coerce_slot(item, i, answers) for i, item in enumerate(raw_schedule[:4])]
    if not slots:
        return _fallback_schedule(answers)
    return _balance_durations(slots, answers["daily_minutes"])


async def generate_fitness_plan(raw_answers: dict[str, Any]) -> dict[str, Any]:
    answers = _normalize_answers(raw_answers)
    schedule = await _gemini_schedule(answers)
    return {
        "fitness_level": answers["fitness_level"],
        "goal": answers["goal"],
        "daily_minutes": answers["daily_minutes"],
        "preferred_windows": answers["preferred_windows"],
        "focus_areas": answers["focus_areas"],
        "schedule": schedule,
        "source": "ai" if (settings.gemini_api_key or "").strip() else "personalized",
    }
