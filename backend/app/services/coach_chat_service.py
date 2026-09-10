"""Grid Coach — conversational fitness help via Gemini."""
from __future__ import annotations

from typing import Any

import httpx

from app.core.config import settings

COACH_SYSTEM = """You are Grid Coach, MOVEGRID's friendly movement and fitness assistant.
You help users with workout struggles, motivation, soreness, scheduling, habit building,
and understanding their daily movement plan. Keep answers practical, encouraging, and concise
(2–4 short paragraphs max unless they ask for detail). You are not a doctor; suggest seeing
a professional for pain, injury, or medical concerns. Prefer bodyweight and no-equipment ideas
when suggesting exercises."""


def _gemini_model_id(raw: str) -> str:
    model = (raw or "gemini-3.8-flash").strip()
    if model.startswith("models/"):
        return model[len("models/") :]
    return model


def _build_contents(
    message: str,
    history: list[dict[str, str]],
    context: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    contents: list[dict[str, Any]] = []
    for turn in history[-12:]:
        role = turn.get("role") or "user"
        text = (turn.get("content") or "").strip()
        if not text:
            continue
        gemini_role = "model" if role in ("model", "assistant") else "user"
        contents.append({"role": gemini_role, "parts": [{"text": text}]})

    user_text = message.strip()
    if context:
        bits = []
        if context.get("fitness_level"):
            bits.append(f"Fitness level: {context['fitness_level']}")
        if context.get("goal"):
            bits.append(f"Goal: {context['goal']}")
        if context.get("daily_minutes"):
            bits.append(f"Daily movement budget: {context['daily_minutes']} min")
        if context.get("focus_areas"):
            areas = context["focus_areas"]
            if isinstance(areas, list):
                bits.append(f"Focus areas: {', '.join(str(a) for a in areas)}")
        if bits:
            user_text = "[User context: " + "; ".join(bits) + "]\n\n" + user_text

    contents.append({"role": "user", "parts": [{"text": user_text}]})
    return contents


async def coach_chat(
    *,
    message: str,
    history: list[dict[str, str]] | None = None,
    context: dict[str, Any] | None = None,
) -> dict[str, str]:
    text = (message or "").strip()
    if not text:
        return {"reply": "Tell me what's going on — I'm here to help with your movement goals."}

    api_key = (settings.gemini_api_key or "").strip()
    if not api_key:
        return {
            "reply": (
                "Grid Coach isn't connected yet (missing GEMINI_API_KEY on the server). "
                "Ask your admin to add the key, then try again."
            )
        }

    model = _gemini_model_id(settings.gemini_model)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "systemInstruction": {"parts": [{"text": COACH_SYSTEM}]},
        "contents": _build_contents(text, history or [], context),
        "generationConfig": {"temperature": 0.75, "maxOutputTokens": 1024},
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
                json=payload,
            )
        if response.status_code >= 400:
            return {
                "reply": "I couldn't reach the coach service right now. Please try again in a moment."
            }
        body = response.json()
        parts = body["candidates"][0]["content"]["parts"]
        reply = next((p.get("text", "") for p in parts if p.get("text")), "").strip()
        if not reply:
            return {"reply": "I didn't get a clear answer — could you rephrase your question?"}
        return {"reply": reply}
    except (KeyError, IndexError, httpx.HTTPError):
        return {
            "reply": "Something went wrong while I was thinking. Please try sending your message again."
        }
