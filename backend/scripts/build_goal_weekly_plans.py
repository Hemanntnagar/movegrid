#!/usr/bin/env python3
"""Generate shared/goal_weekly_plans.json from level-specific 30/60 min schedules."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "shared" / "goal_weekly_plans.json"

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def ex(name: str, prescription: str) -> dict[str, str]:
    return {"name": name, "prescription": prescription}


def rest_day(goal: str, day: str) -> dict[str, Any]:
    d = day.lower()
    return {
        "id": f"{goal}_{d}",
        "day": day,
        "focus": "Rest",
        "durationLabel": "Rest",
        "exercises": [],
        "isRest": True,
    }


def workout_day(
    goal: str,
    day: str,
    focus: str,
    duration_label: str,
    exercises: list[dict[str, str]],
) -> dict[str, Any]:
    d = day.lower()
    return {
        "id": f"{goal}_{d}",
        "day": day,
        "focus": focus,
        "durationLabel": duration_label,
        "exercises": exercises,
    }


DaySpec = list[dict[str, str]] | tuple[list[dict[str, str]], str]


def week(
    goal: str,
    duration_label: str,
    day_specs: list[DaySpec],
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for day, spec in zip(DAYS, day_specs, strict=True):
        if not spec:
            out.append(rest_day(goal, day))
            continue
        if isinstance(spec, tuple):
            exercises, focus = spec
        else:
            exercises = spec
            focus = "Posture & mobility" if goal == "height" else "Training"
        out.append(workout_day(goal, day, focus, duration_label, exercises))
    return out


def wu(minutes: int) -> dict[str, str]:
    return ex("Warm-up", f"{minutes} min")


def walk(minutes: int, label: str = "Easy walk") -> dict[str, str]:
    return ex(label, f"{minutes} min")


HEIGHT_30: list[list[dict[str, str]]] = [
    [
        wu(5),
        ex("Cat-cow", "2 × 10"),
        ex("Dead hang", "3 × 20 sec"),
        ex("Cobra stretch", "2 × 30 sec"),
        ex("Hip-flexor stretch", "2 × 30 sec/side"),
        ex("Hamstring stretch", "2 × 30 sec/side"),
        walk(5),
    ],
    [
        wu(5),
        ex("Cat-cow", "2 × 10"),
        ex("Thoracic rotation", "2 × 10/side"),
        ex("Dead hang", "3 × 20 sec"),
        ex("Child's pose", "2 × 30 sec"),
        ex("Calf stretch", "2 × 30 sec/side"),
        walk(5),
    ],
    [
        wu(5),
        ex("Dead hang", "3 × 20 sec"),
        ex("Cobra stretch", "2 × 30 sec"),
        ex("Hip-flexor stretch", "2 × 30 sec/side"),
        ex("Hamstring stretch", "2 × 30 sec/side"),
        ex("Cat-cow", "2 × 10"),
        walk(5, "Posture walking"),
    ],
    [
        wu(5),
        ex("Thoracic rotation", "2 × 10/side"),
        ex("Cat-cow", "2 × 10"),
        ex("Dead hang", "3 × 20 sec"),
        ex("Child's pose", "2 × 30 sec"),
        ex("Hip-flexor stretch", "2 × 30 sec/side"),
        walk(5),
    ],
    [
        wu(5),
        ex("Dead hang", "3 × 30 sec"),
        ex("Cobra stretch", "2 × 30 sec"),
        ex("Hamstring stretch", "2 × 30 sec/side"),
        ex("Hip-flexor stretch", "2 × 30 sec/side"),
        ex("Thoracic rotation", "2 × 10/side"),
        walk(5),
    ],
    [
        wu(5),
        ex("Cat-cow", "2 × 10"),
        ex("Dead hang", "3 × 20 sec"),
        ex("Child's pose", "2 × 30 sec"),
        ex("Cobra stretch", "2 × 30 sec"),
        ex("Hamstring stretch", "2 × 30 sec/side"),
        walk(5),
    ],
    [],
]

HEIGHT_60: list[list[dict[str, str]]] = [
    [
        wu(10),
        ex("Cat-cow", "3 × 10"),
        ex("Dead hang", "4 × 30 sec"),
        ex("Cobra stretch", "3 × 30 sec"),
        ex("Hip-flexor stretch", "3 × 30 sec/side"),
        ex("Hamstring stretch", "3 × 30 sec/side"),
        ex("Thoracic rotation", "3 × 10/side"),
        walk(10),
    ],
    [
        wu(10),
        ex("Cat-cow", "3 × 10"),
        ex("Dead hang", "4 × 30 sec"),
        ex("Child's pose", "3 × 30 sec"),
        ex("Calf stretch", "3 × 30 sec/side"),
        ex("Hip-flexor stretch", "3 × 30 sec/side"),
        ex("Thoracic rotation", "3 × 10/side"),
        walk(10),
    ],
    [
        wu(10),
        ex("Dead hang", "4 × 30 sec"),
        ex("Cobra stretch", "3 × 30 sec"),
        ex("Hamstring stretch", "3 × 30 sec/side"),
        ex("Hip-flexor stretch", "3 × 30 sec/side"),
        ex("Child's pose", "3 × 30 sec"),
        walk(10, "Posture walking"),
    ],
    [
        wu(10),
        ex("Cat-cow", "3 × 10"),
        ex("Thoracic rotation", "3 × 10/side"),
        ex("Dead hang", "4 × 30 sec"),
        ex("Cobra stretch", "3 × 30 sec"),
        ex("Hip-flexor stretch", "3 × 30 sec/side"),
        ex("Hamstring stretch", "3 × 30 sec/side"),
        walk(10),
    ],
    [
        wu(10),
        ex("Dead hang", "4 × 30 sec"),
        ex("Cat-cow", "3 × 10"),
        ex("Cobra stretch", "3 × 30 sec"),
        ex("Hip-flexor stretch", "3 × 30 sec/side"),
        ex("Hamstring stretch", "3 × 30 sec/side"),
        ex("Thoracic rotation", "3 × 10/side"),
        walk(10),
    ],
    [
        wu(10),
        ex("Cat-cow", "3 × 10"),
        ex("Dead hang", "4 × 30 sec"),
        ex("Child's pose", "3 × 30 sec"),
        ex("Cobra stretch", "3 × 30 sec"),
        ex("Hip mobility", "10 min"),
        walk(10),
    ],
    [],
]

WG_30: list[list[dict[str, str]]] = [
    [wu(5), ex("Squat", "3 × 10"), ex("Push-up", "3 × 8"), ex("Row", "3 × 10"), ex("Plank", "2 × 30 sec")],
    [
        wu(5),
        ex("Reverse lunge", "3 × 8/leg"),
        ex("Glute bridge", "3 × 12"),
        ex("Romanian deadlift", "3 × 10"),
        ex("Calf raise", "2 × 15"),
    ],
    [
        wu(5),
        ex("Push-up", "3 × 10"),
        ex("Row", "3 × 10"),
        ex("Shoulder press", "3 × 10"),
        ex("Biceps curl", "2 × 12"),
    ],
    [
        wu(5),
        ex("Squat", "3 × 10"),
        ex("Lunge", "3 × 8/leg"),
        ex("Hip thrust", "3 × 12"),
        ex("Plank", "2 × 30 sec"),
    ],
    [
        wu(5),
        ex("Push-up", "3 × 10"),
        ex("Row", "3 × 10"),
        ex("Shoulder press", "3 × 10"),
        ex("Triceps extension", "2 × 12"),
    ],
    [
        wu(5),
        ex("Squat", "3 × 10"),
        ex("Romanian deadlift", "3 × 10"),
        ex("Glute bridge", "3 × 12"),
        ex("Calf raise", "2 × 15"),
    ],
    [],
]

WG_60: list[list[dict[str, str]]] = [
    [
        wu(10),
        ex("Squat", "4 × 10"),
        ex("Push-up", "4 × 10"),
        ex("Row", "4 × 10"),
        ex("Shoulder press", "3 × 10"),
        ex("Plank", "3 × 40 sec"),
    ],
    [
        wu(10),
        ex("Squat", "4 × 10"),
        ex("Reverse lunge", "3 × 10/leg"),
        ex("Romanian deadlift", "3 × 10"),
        ex("Hip thrust", "3 × 12"),
        ex("Calf raise", "3 × 15"),
    ],
    [
        wu(10),
        ex("Push-up", "4 × 10"),
        ex("Row", "4 × 10"),
        ex("Shoulder press", "3 × 10"),
        ex("Biceps curl", "3 × 12"),
        ex("Triceps extension", "3 × 12"),
    ],
    [
        wu(10),
        ex("Goblet squat", "4 × 10"),
        ex("Lunge", "3 × 10/leg"),
        ex("Hip thrust", "4 × 12"),
        ex("Romanian deadlift", "3 × 10"),
        ex("Plank", "3 × 45 sec"),
    ],
    [
        wu(10),
        ex("Push-up", "4 × 10"),
        ex("Row", "4 × 10"),
        ex("Shoulder press", "3 × 10"),
        ex("Biceps curl", "3 × 12"),
        ex("Triceps extension", "3 × 12"),
    ],
    [
        wu(10),
        ex("Squat", "4 × 10"),
        ex("Romanian deadlift", "3 × 10"),
        ex("Bulgarian split squat", "3 × 8/leg"),
        ex("Hip thrust", "3 × 12"),
        ex("Calf raise", "3 × 15"),
    ],
    [],
]

WL_30: list[list[dict[str, str]]] = [
    [
        wu(5),
        ex("Squat", "3 × 10"),
        ex("Push-up", "3 × 8"),
        ex("Row", "3 × 10"),
        walk(10, "Brisk walk"),
    ],
    [wu(5), walk(20, "Brisk walk"), ex("Stretching", "5 min")],
    [
        wu(5),
        ex("Lunge", "3 × 8/leg"),
        ex("Push-up", "3 × 8"),
        ex("Glute bridge", "3 × 12"),
        walk(10, "Brisk walk"),
    ],
    [wu(5), walk(20, "Brisk walk"), ex("Stretching", "5 min")],
    [
        wu(5),
        ex("Squat", "3 × 10"),
        ex("Row", "3 × 10"),
        ex("Push-up", "3 × 8"),
        walk(10, "Brisk walk"),
    ],
    [wu(5), ex("Cycling or brisk walking", "25 min")],
    [],
]

WL_60: list[list[dict[str, str]]] = [
    [
        wu(10),
        ex("Squat", "3 × 12"),
        ex("Push-up", "3 × 10"),
        ex("Row", "3 × 10"),
        ex("Lunge", "3 × 10/leg"),
        walk(20, "Brisk walk"),
    ],
    [wu(10), ex("Brisk walking or cycling", "40 min"), ex("Stretching", "10 min")],
    [
        wu(10),
        ex("Squat", "3 × 12"),
        ex("Push-up", "3 × 10"),
        ex("Glute bridge", "3 × 15"),
        ex("Row", "3 × 10"),
        walk(20),
    ],
    [wu(10), walk(40, "Brisk walk"), ex("Stretching", "10 min")],
    [
        wu(10),
        ex("Lunge", "3 × 10/leg"),
        ex("Push-up", "3 × 10"),
        ex("Row", "3 × 10"),
        ex("Squat", "3 × 12"),
        walk(20),
    ],
    [wu(10), ex("Cycling or walking", "45 min"), ex("Stretching", "5 min")],
    [],
]

STR_30: list[list[dict[str, str]]] = [
    [
        wu(5),
        ex("Squat", "3 × 8"),
        ex("Push-up", "3 × 8"),
        ex("Row", "3 × 10"),
        ex("Plank", "3 × 30 sec"),
    ],
    [
        wu(5),
        ex("Dead bug", "3 × 10/side"),
        ex("Side plank", "2 × 20 sec/side"),
        ex("Bird dog", "3 × 10/side"),
        ex("Glute bridge", "3 × 12"),
    ],
    [
        wu(5),
        ex("Reverse lunge", "3 × 8/leg"),
        ex("Shoulder press", "3 × 8"),
        ex("Row", "3 × 10"),
        ex("Plank", "3 × 30 sec"),
    ],
    [
        wu(5),
        ex("Romanian deadlift", "3 × 8"),
        ex("Push-up", "3 × 8"),
        ex("Lunge", "3 × 8/leg"),
        ex("Side plank", "2 × 20 sec/side"),
    ],
    [
        wu(5),
        ex("Squat", "3 × 8"),
        ex("Row", "3 × 10"),
        ex("Push-up", "3 × 8"),
        ex("Dead bug", "3 × 10/side"),
    ],
    [
        wu(5),
        ex("Glute bridge", "3 × 12"),
        ex("Bird dog", "3 × 10/side"),
        ex("Plank", "3 × 30 sec"),
        walk(10),
    ],
    [],
]

STR_60: list[list[dict[str, str]]] = [
    [
        wu(10),
        ex("Squat", "4 × 8"),
        ex("Push-up", "4 × 8"),
        ex("Row", "4 × 10"),
        ex("Plank", "3 × 45 sec"),
    ],
    [
        wu(10),
        ex("Dead bug", "3 × 12/side"),
        ex("Side plank", "3 × 30 sec/side"),
        ex("Bird dog", "3 × 12/side"),
        ex("Glute bridge", "3 × 15"),
        walk(20),
    ],
    [
        wu(10),
        ex("Romanian deadlift", "4 × 8"),
        ex("Shoulder press", "3 × 8"),
        ex("Lunge", "3 × 10/leg"),
        ex("Plank", "3 × 45 sec"),
    ],
    [
        wu(10),
        ex("Squat", "4 × 8"),
        ex("Row", "4 × 10"),
        ex("Push-up", "4 × 8"),
        ex("Side plank", "3 × 30 sec/side"),
    ],
    [
        wu(10),
        ex("Hip thrust", "4 × 10"),
        ex("Shoulder press", "3 × 8"),
        ex("Lunge", "3 × 10/leg"),
        ex("Dead bug", "3 × 12/side"),
    ],
    [
        wu(10),
        ex("Plank", "3 × 45 sec"),
        ex("Bird dog", "3 × 12/side"),
        ex("Side plank", "3 × 30 sec/side"),
        walk(30),
    ],
    [],
]

DF_30: list[list[dict[str, str]]] = [
    [
        wu(5),
        ex("Squat", "3 × 10"),
        ex("Push-up", "3 × 8"),
        ex("Row", "3 × 10"),
        ex("Plank", "2 × 30 sec"),
    ],
    [wu(5), walk(20, "Brisk walking"), ex("Stretching", "5 min")],
    [
        wu(5),
        ex("Lunge", "3 × 8/leg"),
        ex("Push-up", "3 × 8"),
        ex("Glute bridge", "3 × 12"),
        ex("Side plank", "2 × 20 sec/side"),
    ],
    [ex("Mobility", "5 min"), ex("Cycling or walking", "20 min"), ex("Stretching", "5 min")],
    [
        wu(5),
        ex("Squat", "3 × 10"),
        ex("Row", "3 × 10"),
        ex("Shoulder press", "3 × 8"),
        ex("Plank", "2 × 30 sec"),
    ],
    [wu(5), ex("Easy jog or cycle", "20 min"), ex("Stretching", "5 min")],
    [],
]

DF_60: list[list[dict[str, str]]] = [
    [
        wu(10),
        ex("Squat", "3 × 10"),
        ex("Push-up", "3 × 10"),
        ex("Row", "3 × 10"),
        ex("Plank", "3 × 40 sec"),
        walk(15),
    ],
    [wu(10), walk(40, "Brisk walking"), ex("Stretching", "10 min")],
    [
        wu(10),
        ex("Lunge", "3 × 10/leg"),
        ex("Push-up", "3 × 10"),
        ex("Glute bridge", "3 × 15"),
        ex("Side plank", "3 × 30 sec/side"),
        walk(15),
    ],
    [ex("Mobility", "10 min"), ex("Cycling or walking", "40 min"), ex("Stretching", "10 min")],
    [
        wu(10),
        ex("Squat", "3 × 10"),
        ex("Row", "3 × 10"),
        ex("Shoulder press", "3 × 10"),
        ex("Plank", "3 × 40 sec"),
        walk(15),
    ],
    [wu(10), ex("Easy cardio", "40 min"), ex("Stretching", "10 min")],
    [],
]

VariantSpecs = list[DaySpec]

# --- Intermediate schedules ---

I_HEIGHT_30: VariantSpecs = [
    [
        wu(5),
        ex("Dead hang", "3 × 40 sec"),
        ex("Cat-cow", "3 × 12"),
        ex("Thoracic rotation", "3 × 10/side"),
        ex("Cobra stretch", "2 × 40 sec"),
        ex("Hip stretch", "3 × 40 sec/side"),
    ],
    [
        wu(5),
        ex("Dead hang", "3 × 40 sec"),
        ex("Child's pose", "3 × 40 sec"),
        ex("Hamstring stretch", "3 × 40 sec/side"),
        ex("Hip-flexor stretch", "3 × 40 sec/side"),
        ex("Thoracic rotation", "3 × 10/side"),
    ],
    [
        wu(5),
        ex("Cat-cow", "3 × 12"),
        ex("Dead hang", "3 × 40 sec"),
        ex("Cobra stretch", "2 × 40 sec"),
        ex("Hip mobility", "8 min"),
        ex("Hamstring mobility", "8 min"),
        walk(5),
    ],
    [
        wu(5),
        ex("Thoracic rotation", "3 × 10/side"),
        ex("Dead hang", "3 × 40 sec"),
        ex("Child's pose", "3 × 40 sec"),
        ex("Hip-flexor stretch", "3 × 40 sec/side"),
        ex("Calf stretch", "3 × 30 sec/side"),
        walk(5),
    ],
    [
        wu(5),
        ex("Dead hang", "3 × 45 sec"),
        ex("Cobra stretch", "2 × 40 sec"),
        ex("Cat-cow", "3 × 12"),
        ex("Hamstring stretch", "3 × 40 sec/side"),
        ex("Hip stretch", "3 × 40 sec/side"),
        walk(5, "Posture walk"),
    ],
    [
        wu(5),
        ex("Cat-cow", "3 × 12"),
        ex("Thoracic rotation", "3 × 10/side"),
        ex("Dead hang", "3 × 40 sec"),
        ex("Cobra stretch", "2 × 40 sec"),
        ex("Hip mobility", "8 min"),
        walk(5),
    ],
    [],
]

I_HEIGHT_60: VariantSpecs = [
    [
        wu(10),
        ex("Dead hang", "4 × 45 sec"),
        ex("Cat-cow", "3 × 12"),
        ex("Thoracic rotation", "3 × 10/side"),
        ex("Cobra stretch", "3 × 40 sec"),
        ex("Hip stretch", "3 × 45 sec/side"),
        walk(10),
    ],
    [
        wu(10),
        ex("Dead hang", "4 × 45 sec"),
        ex("Child's pose", "3 × 45 sec"),
        ex("Hamstring stretch", "3 × 45 sec/side"),
        ex("Hip-flexor stretch", "3 × 45 sec/side"),
        ex("Thoracic rotation", "3 × 10/side"),
        walk(10),
    ],
    [
        wu(10),
        ex("Cat-cow", "3 × 12"),
        ex("Dead hang", "4 × 45 sec"),
        ex("Cobra stretch", "3 × 40 sec"),
        ex("Hip mobility", "12 min"),
        ex("Hamstring mobility", "12 min"),
        walk(10),
    ],
    [
        wu(10),
        ex("Thoracic rotation", "3 × 10/side"),
        ex("Dead hang", "4 × 45 sec"),
        ex("Child's pose", "3 × 45 sec"),
        ex("Hip-flexor stretch", "3 × 45 sec/side"),
        ex("Calf stretch", "3 × 30 sec/side"),
        walk(10),
    ],
    [
        wu(10),
        ex("Dead hang", "4 × 50 sec"),
        ex("Cobra stretch", "3 × 40 sec"),
        ex("Cat-cow", "3 × 12"),
        ex("Hamstring stretch", "3 × 45 sec/side"),
        ex("Hip stretch", "3 × 45 sec/side"),
        walk(10, "Posture walk"),
    ],
    [
        wu(10),
        ex("Cat-cow", "3 × 12"),
        ex("Thoracic rotation", "3 × 10/side"),
        ex("Dead hang", "4 × 45 sec"),
        ex("Cobra stretch", "3 × 40 sec"),
        ex("Hip mobility", "12 min"),
        walk(10),
    ],
    [],
]

I_WG_30: VariantSpecs = [
    [
        ex("Bench press or push-up", "3 × 8"),
        ex("Row", "3 × 8"),
        ex("Shoulder press", "3 × 8"),
        ex("Plank", "3 × 40 sec"),
    ],
    [
        ex("Squat", "4 × 8"),
        ex("Romanian deadlift", "3 × 8"),
        ex("Lunge", "3 × 8/leg"),
    ],
    [
        ex("Pull-up or lat pulldown", "3 × 8"),
        ex("Row", "3 × 8"),
        ex("Biceps curl", "3 × 10"),
    ],
    [
        ex("Squat", "4 × 8"),
        ex("Hip thrust", "3 × 10"),
        ex("Bulgarian split squat", "3 × 8/leg"),
    ],
    [
        ex("Bench press", "3 × 8"),
        ex("Shoulder press", "3 × 8"),
        ex("Row", "3 × 8"),
        ex("Triceps extension", "3 × 10"),
    ],
    [
        ex("Romanian deadlift", "3 × 8"),
        ex("Squat", "3 × 8"),
        ex("Hip thrust", "3 × 10"),
        ex("Calf raise", "3 × 15"),
    ],
    [],
]

I_WG_60: list[DaySpec] = [
    [
        ex("Bench press", "4 × 8"),
        ex("Row", "4 × 8"),
        ex("Shoulder press", "3 × 8"),
        ex("Incline press", "3 × 10"),
        ex("Triceps extension", "3 × 10"),
    ],
    [
        ex("Squat", "4 × 8"),
        ex("Romanian deadlift", "4 × 8"),
        ex("Lunge", "3 × 10/leg"),
        ex("Hip thrust", "3 × 10"),
        ex("Calf raise", "3 × 15"),
    ],
    [
        ex("Pull-up", "4 × 6–8"),
        ex("Row", "4 × 8"),
        ex("Lat pulldown", "3 × 10"),
        ex("Biceps curl", "3 × 10"),
        ex("Plank", "3 × 45 sec"),
    ],
    (
        [
            walk(30),
            ex("Mobility", "20 min"),
            ex("Stretching", "10 min"),
        ],
        "Recovery",
    ),
    [
        ex("Bench press", "4 × 8"),
        ex("Shoulder press", "4 × 8"),
        ex("Row", "4 × 8"),
        ex("Triceps extension", "3 × 10"),
        ex("Core", "3 sets"),
    ],
    [
        ex("Squat", "4 × 8"),
        ex("Romanian deadlift", "3 × 8"),
        ex("Bulgarian split squat", "3 × 8/leg"),
        ex("Hip thrust", "3 × 10"),
        ex("Calf raise", "3 × 15"),
    ],
    [],
]

I_WL_30: VariantSpecs = [
    [
        wu(5),
        ex("Squat", "3 × 10"),
        ex("Push-up", "3 × 10"),
        ex("Row", "3 × 10"),
        walk(10, "Brisk walk"),
    ],
    [wu(5), ex("Jog or cycle", "20 min"), ex("Stretching", "5 min")],
    [
        wu(5),
        ex("Lunge", "3 × 10/leg"),
        ex("Push-up", "3 × 10"),
        ex("Row", "3 × 10"),
        ex("Cardio", "10 min"),
    ],
    [wu(5), ex("Brisk cardio", "20 min"), ex("Stretching", "5 min")],
    [
        wu(5),
        ex("Squat", "3 × 10"),
        ex("Row", "3 × 10"),
        ex("Shoulder press", "3 × 10"),
        ex("Cardio", "10 min"),
    ],
    [wu(5), ex("Cardio", "25 min")],
    [],
]

I_WL_60: VariantSpecs = [
    [
        wu(10),
        ex("Squat", "4 × 10"),
        ex("Push-up", "4 × 10"),
        ex("Row", "4 × 10"),
        ex("Lunge", "3 × 10/leg"),
        walk(20, "Brisk walk"),
    ],
    [wu(10), ex("Jog or cycle", "40 min"), ex("Stretching", "10 min")],
    [
        wu(10),
        ex("Squat", "4 × 10"),
        ex("Push-up", "4 × 10"),
        ex("Glute bridge", "3 × 15"),
        ex("Row", "4 × 10"),
        walk(20, "Cardio"),
    ],
    [wu(10), walk(45, "Brisk cardio"), ex("Stretching", "5 min")],
    [
        wu(10),
        ex("Lunge", "4 × 10/leg"),
        ex("Push-up", "4 × 10"),
        ex("Row", "4 × 10"),
        ex("Squat", "4 × 10"),
        walk(20, "Cardio"),
    ],
    [wu(10), ex("Cardio", "40 min"), ex("Mobility", "10 min")],
    [],
]

I_STR_30: VariantSpecs = [
    [
        ex("Squat", "4 × 6"),
        ex("Push-up", "4 × 8"),
        ex("Row", "4 × 8"),
        ex("Plank", "3 × 45 sec"),
    ],
    [
        ex("Romanian deadlift", "4 × 6"),
        ex("Shoulder press", "3 × 6"),
        ex("Side plank", "3 × 30 sec/side"),
    ],
    [],
    [
        ex("Squat", "4 × 6"),
        ex("Row", "4 × 8"),
        ex("Push-up", "3 × 8"),
        ex("Dead bug", "3 × 12/side"),
    ],
    [
        ex("Romanian deadlift", "4 × 6"),
        ex("Shoulder press", "3 × 6"),
        ex("Lunge", "3 × 8/leg"),
        ex("Plank", "3 × 45 sec"),
    ],
    [
        ex("Dead bug", "3 × 12/side"),
        ex("Bird dog", "3 × 12/side"),
        ex("Side plank", "3 × 30 sec/side"),
        ex("Cardio", "15 min"),
    ],
    [],
]

I_STR_60: VariantSpecs = [
    [
        ex("Squat", "4 × 5–8"),
        ex("Bench press or push-up", "4 × 6–8"),
        ex("Row", "4 × 8"),
        ex("Plank", "3 × 45 sec"),
    ],
    [
        ex("Romanian deadlift", "4 × 6–8"),
        ex("Shoulder press", "4 × 6–8"),
        ex("Lunge", "3 × 8/leg"),
        ex("Side plank", "3 × 30 sec/side"),
    ],
    [],
    [
        ex("Deadlift", "4 × 4–6"),
        ex("Bench press or push-up", "4 × 8"),
        ex("Row", "4 × 8"),
        ex("Hanging knee raise", "3 × 10"),
    ],
    [
        ex("Squat", "4 × 6"),
        ex("Shoulder press", "4 × 6"),
        ex("Pull-up", "3 × 6–8"),
        ex("Plank", "3 × 60 sec"),
    ],
    [
        ex("Core circuit", "20 min"),
        ex("Cardio", "30 min"),
        ex("Mobility", "10 min"),
    ],
    [],
]

I_DF_30: VariantSpecs = [
    [
        ex("Squat", "3 × 10"),
        ex("Push-up", "3 × 10"),
        ex("Row", "3 × 10"),
        ex("Plank", "3 × 30 sec"),
        ex("Cardio", "5 min"),
    ],
    [ex("Brisk cardio", "25 min"), ex("Stretching", "5 min")],
    [
        ex("Lunge", "3 × 10/leg"),
        ex("Shoulder press", "3 × 10"),
        ex("Row", "3 × 10"),
        ex("Side plank", "3 × 30 sec/side"),
    ],
    [ex("Cardio", "20 min"), ex("Mobility", "10 min")],
    [
        ex("Squat", "3 × 10"),
        ex("Push-up", "3 × 10"),
        ex("Row", "3 × 10"),
        ex("Plank", "3 × 30 sec"),
        ex("Cardio", "5 min"),
    ],
    [ex("Cycling or jogging", "25 min"), ex("Stretching", "5 min")],
    [],
]

I_DF_60: VariantSpecs = [
    [
        wu(10),
        ex("Squat", "4 × 10"),
        ex("Push-up", "4 × 10"),
        ex("Row", "4 × 10"),
        ex("Plank", "3 × 40 sec"),
        walk(15, "Cardio"),
        ex("Stretching", "5 min"),
    ],
    [wu(10), ex("Cardio", "40 min"), ex("Mobility", "10 min")],
    [
        wu(10),
        ex("Lunge", "4 × 10/leg"),
        ex("Shoulder press", "3 × 10"),
        ex("Row", "4 × 10"),
        ex("Glute bridge", "3 × 15"),
        walk(15, "Cardio"),
        ex("Stretching", "5 min"),
    ],
    [ex("Mobility", "10 min"), ex("Cardio", "40 min"), ex("Core work", "10 min")],
    [
        wu(10),
        ex("Squat", "4 × 10"),
        ex("Push-up", "4 × 10"),
        ex("Row", "4 × 10"),
        ex("Plank", "3 × 40 sec"),
        walk(15, "Cardio"),
        ex("Stretching", "5 min"),
    ],
    [ex("Cardio", "45 min"), ex("Mobility", "15 min")],
    [],
]

# --- Advanced schedules ---

A_HEIGHT_30: VariantSpecs = [
    [
        wu(5),
        ex("Dead hang", "3 × 60 sec"),
        ex("Thoracic rotation", "3 × 10/side"),
        ex("Cobra stretch", "2 × 45 sec"),
        ex("Hip mobility", "8 min"),
        ex("Hamstring mobility", "8 min"),
    ],
    [
        wu(5),
        ex("Dead hang", "3 × 60 sec"),
        ex("Cat-cow", "3 × 12"),
        ex("Child's pose", "3 × 45 sec"),
        ex("Hip-flexor stretch", "3 × 45 sec/side"),
        ex("Hamstring stretch", "3 × 45 sec/side"),
        ex("Posture work", "5 min"),
    ],
    [
        wu(5),
        ex("Dead hang", "3 × 60 sec"),
        ex("Thoracic rotation", "3 × 10/side"),
        ex("Cobra stretch", "2 × 45 sec"),
        ex("Hip mobility", "8 min"),
        walk(5),
    ],
    [
        wu(5),
        ex("Cat-cow", "3 × 12"),
        ex("Dead hang", "3 × 60 sec"),
        ex("Child's pose", "3 × 45 sec"),
        ex("Hamstring stretch", "3 × 45 sec/side"),
        ex("Hip-flexor stretch", "3 × 45 sec/side"),
        ex("Posture work", "5 min"),
    ],
    [
        wu(5),
        ex("Dead hang", "3 × 60 sec"),
        ex("Thoracic mobility", "10 min"),
        ex("Cobra stretch", "2 × 45 sec"),
        ex("Hip mobility", "8 min"),
        ex("Hamstring mobility", "8 min"),
    ],
    [
        wu(5),
        ex("Dead hang", "3 × 60 sec"),
        ex("Cat-cow", "3 × 12"),
        ex("Thoracic rotation", "3 × 10/side"),
        ex("Hip mobility", "8 min"),
        walk(5),
    ],
    [],
]

A_HEIGHT_60: VariantSpecs = [
    [
        wu(10),
        ex("Thoracic mobility", "15 min"),
        ex("Dead hang", "10 min"),
        ex("Hip mobility", "15 min"),
        ex("Posture and core", "10 min"),
    ],
    [
        wu(10),
        ex("Hanging", "10 min"),
        ex("Hamstring work", "15 min"),
        ex("Hip work", "15 min"),
        ex("Posture work", "10 min"),
    ],
    [
        wu(10),
        ex("Spine mobility", "15 min"),
        ex("Hanging", "10 min"),
        ex("Hip mobility", "15 min"),
        walk(10),
    ],
    [
        wu(10),
        ex("Thoracic work", "15 min"),
        ex("Hanging", "10 min"),
        ex("Hamstring work", "15 min"),
        ex("Posture work", "10 min"),
    ],
    [
        wu(10),
        ex("Hanging", "10 min"),
        ex("Hip mobility", "15 min"),
        ex("Spine mobility", "15 min"),
        walk(10),
    ],
    [
        wu(10),
        ex("Mobility", "20 min"),
        ex("Hanging", "10 min"),
        ex("Posture work", "10 min"),
        walk(10),
    ],
    [],
]

A_WG_30: VariantSpecs = [
    [
        ex("Bench press", "4 × 6"),
        ex("Row", "4 × 6"),
        ex("Shoulder press", "3 × 8"),
    ],
    [
        ex("Squat", "4 × 6"),
        ex("Romanian deadlift", "3 × 8"),
        ex("Calf raise", "3 × 12"),
    ],
    [
        ex("Pull-up", "4 × 6"),
        ex("Row", "3 × 8"),
        ex("Biceps curl", "3 × 10"),
    ],
    [
        ex("Hip thrust", "4 × 8"),
        ex("Bulgarian split squat", "3 × 8/leg"),
        ex("Romanian deadlift", "3 × 8"),
    ],
    [
        ex("Bench press", "4 × 6"),
        ex("Shoulder press", "3 × 8"),
        ex("Triceps extension", "3 × 10"),
    ],
    [
        ex("Squat", "4 × 6"),
        ex("Romanian deadlift", "3 × 8"),
        ex("Hip thrust", "3 × 10"),
    ],
    [],
]

A_WG_60: list[DaySpec] = [
    [
        ex("Bench press", "4 × 6"),
        ex("Incline press", "3 × 8"),
        ex("Shoulder press", "3 × 8"),
        ex("Triceps extension", "3 × 10"),
        ex("Core", "3 sets"),
    ],
    [
        ex("Squat", "4 × 6"),
        ex("Romanian deadlift", "4 × 6"),
        ex("Lunge", "3 × 8/leg"),
        ex("Hip thrust", "3 × 8"),
        ex("Calf raise", "3 × 12"),
    ],
    [
        ex("Pull-up", "4 × 6"),
        ex("Row", "4 × 8"),
        ex("Lat pulldown", "3 × 8"),
        ex("Biceps curl", "3 × 10"),
        ex("Core", "3 sets"),
    ],
    (
        [
            walk(30),
            ex("Mobility", "20 min"),
            ex("Stretching", "10 min"),
        ],
        "Rest / recovery",
    ),
    [
        ex("Bench press", "4 × 6"),
        ex("Shoulder press", "4 × 6"),
        ex("Row", "4 × 8"),
        ex("Triceps extension", "3 × 10"),
        ex("Core", "3 sets"),
    ],
    [
        ex("Squat", "4 × 6"),
        ex("Romanian deadlift", "4 × 6"),
        ex("Bulgarian split squat", "3 × 8/leg"),
        ex("Hip thrust", "3 × 10"),
        ex("Calf raise", "3 × 12"),
    ],
    [],
]

A_WL_30: VariantSpecs = [
    [
        wu(5),
        ex("Squat", "3 × 8"),
        ex("Push-up", "3 × 10"),
        ex("Row", "3 × 8"),
        ex("Cardio", "10 min"),
    ],
    [wu(5), ex("Jogging or cycling", "20 min"), ex("Stretching", "5 min")],
    [
        wu(5),
        ex("Romanian deadlift", "3 × 8"),
        ex("Shoulder press", "3 × 8"),
        ex("Lunge", "3 × 8/leg"),
        ex("Cardio", "10 min"),
    ],
    [wu(5), ex("Cardio", "20 min"), ex("Mobility", "5 min")],
    [
        wu(5),
        ex("Squat", "3 × 8"),
        ex("Row", "3 × 8"),
        ex("Push-up", "3 × 10"),
        ex("Cardio", "10 min"),
    ],
    [wu(5), ex("Cardio", "20 min"), ex("Stretching", "5 min")],
    [],
]

A_WL_60: VariantSpecs = [
    [
        wu(10),
        ex("Squat", "4 × 8"),
        ex("Push-up", "4 × 10"),
        ex("Row", "4 × 8"),
        ex("Lunge", "3 × 8/leg"),
        ex("Cardio", "20 min"),
    ],
    [wu(10), ex("Cardio", "45 min"), ex("Stretching", "5 min")],
    [
        wu(10),
        ex("Romanian deadlift", "4 × 8"),
        ex("Shoulder press", "4 × 8"),
        ex("Lunge", "3 × 8/leg"),
        ex("Row", "4 × 8"),
        ex("Cardio", "20 min"),
    ],
    [wu(10), ex("Cardio", "40 min"), ex("Mobility", "10 min")],
    [
        wu(10),
        ex("Squat", "4 × 8"),
        ex("Row", "4 × 8"),
        ex("Push-up", "4 × 10"),
        ex("Cardio", "20 min"),
    ],
    [wu(10), ex("Moderate cardio", "45 min"), ex("Stretching", "5 min")],
    [],
]

A_STR_30: VariantSpecs = [
    [
        ex("Squat", "4 × 5"),
        ex("Bench press", "4 × 5"),
        ex("Plank", "3 × 60 sec"),
    ],
    [
        ex("Deadlift", "4 × 3"),
        ex("Row", "4 × 6"),
        ex("Side plank", "3 × 45 sec/side"),
    ],
    [],
    [
        ex("Squat", "4 × 5"),
        ex("Shoulder press", "4 × 5"),
        ex("Hanging knee raise", "3 × 10"),
    ],
    [
        ex("Romanian deadlift", "4 × 6"),
        ex("Pull-up", "4 × 6"),
        ex("Plank", "3 × 60 sec"),
    ],
    [
        ex("Dead bug", "3 × 12/side"),
        ex("Side plank", "3 × 45 sec/side"),
        ex("Bird dog", "3 × 12/side"),
        ex("Cardio", "10 min"),
    ],
    [],
]

A_STR_60: VariantSpecs = [
    [
        ex("Squat", "5 × 3–5"),
        ex("Bench press", "5 × 3–5"),
        ex("Row", "4 × 6"),
        ex("Plank", "3 × 60 sec"),
    ],
    [
        ex("Deadlift", "5 × 3"),
        ex("Overhead press", "4 × 5"),
        ex("Pull-up", "4 × 6"),
        ex("Side plank", "3 × 45 sec/side"),
    ],
    [],
    [
        ex("Squat", "5 × 3–5"),
        ex("Romanian deadlift", "3 × 6"),
        ex("Bench press", "4 × 6"),
        ex("Hanging knee raise", "3 × 10"),
    ],
    [
        ex("Deadlift", "4 × 3"),
        ex("Shoulder press", "4 × 5"),
        ex("Row", "4 × 6"),
        ex("Plank", "3 × 60 sec"),
    ],
    [
        ex("Core work", "20 min"),
        ex("Easy cardio", "30 min"),
        ex("Mobility", "10 min"),
    ],
    [],
]

A_DF_30: VariantSpecs = [
    [
        ex("Squat", "3 × 8"),
        ex("Push-up", "3 × 10"),
        ex("Row", "3 × 8"),
        ex("Plank", "3 × 45 sec"),
    ],
    [ex("Cardio", "25 min"), ex("Mobility", "5 min")],
    [
        ex("Romanian deadlift", "3 × 8"),
        ex("Shoulder press", "3 × 8"),
        ex("Lunge", "3 × 8/leg"),
        ex("Side plank", "3 × 45 sec/side"),
    ],
    [ex("Cardio", "20 min"), ex("Mobility", "10 min")],
    [
        ex("Squat", "3 × 8"),
        ex("Row", "3 × 8"),
        ex("Push-up", "3 × 10"),
        ex("Plank", "3 × 45 sec"),
    ],
    [ex("Cardio", "25 min"), ex("Stretching", "5 min")],
    [],
]

A_DF_60: VariantSpecs = [
    [
        wu(10),
        ex("Squat", "4 × 8"),
        ex("Push-up", "4 × 10"),
        ex("Row", "4 × 8"),
        ex("Plank", "3 × 45 sec"),
        ex("Cardio", "10 min"),
    ],
    [wu(10), ex("Cardio", "40 min"), ex("Mobility", "10 min")],
    [
        wu(10),
        ex("Romanian deadlift", "4 × 8"),
        ex("Shoulder press", "4 × 8"),
        ex("Lunge", "3 × 10/leg"),
        ex("Side plank", "3 × 45 sec/side"),
        walk(10),
    ],
    [
        ex("Mobility", "10 min"),
        ex("Cardio", "35 min"),
        ex("Core work", "10 min"),
        ex("Stretching", "5 min"),
    ],
    [
        wu(10),
        ex("Squat", "4 × 8"),
        ex("Row", "4 × 8"),
        ex("Push-up", "4 × 10"),
        ex("Plank", "3 × 45 sec"),
        ex("Cardio", "10 min"),
    ],
    [
        wu(10),
        ex("Cycling, jogging, or walking", "40 min"),
        ex("Mobility", "10 min"),
    ],
    [],
]


def goal_entry(
    goal: str,
    headline: str,
    subtitle: str,
    *,
    beginner_30: VariantSpecs,
    beginner_60: VariantSpecs,
    intermediate_30: VariantSpecs,
    intermediate_60: VariantSpecs,
    advanced_30: VariantSpecs,
    advanced_60: VariantSpecs,
) -> dict[str, Any]:
    return {
        "goal": goal,
        "headline": headline,
        "subtitle": subtitle,
        "variants": {
            "beginner_30": {"days": week(goal, "30 min", beginner_30)},
            "beginner_60": {"days": week(goal, "60 min", beginner_60)},
            "intermediate_30": {"days": week(goal, "30 min", intermediate_30)},
            "intermediate_60": {"days": week(goal, "60 min", intermediate_60)},
            "advanced_30": {"days": week(goal, "30 min", advanced_30)},
            "advanced_60": {"days": week(goal, "60 min", advanced_60)},
        },
    }


CATALOG: dict[str, Any] = {
    "height": goal_entry(
        "height",
        "Height / posture plan",
        "Posture, spinal mobility, and stretching — schedules scale by level and daily time.",
        beginner_30=HEIGHT_30,
        beginner_60=HEIGHT_60,
        intermediate_30=I_HEIGHT_30,
        intermediate_60=I_HEIGHT_60,
        advanced_30=A_HEIGHT_30,
        advanced_60=A_HEIGHT_60,
    ),
    "weight_gain": goal_entry(
        "weight_gain",
        "Weight gain / muscle gain plan",
        "Build muscle and strength with structured full-body and split emphasis days.",
        beginner_30=WG_30,
        beginner_60=WG_60,
        intermediate_30=I_WG_30,
        intermediate_60=I_WG_60,
        advanced_30=A_WG_30,
        advanced_60=A_WG_60,
    ),
    "weight_loss": goal_entry(
        "weight_loss",
        "Weight loss / fat loss plan",
        "Strength circuits plus brisk cardio to increase calorie burn while keeping muscle.",
        beginner_30=WL_30,
        beginner_60=WL_60,
        intermediate_30=I_WL_30,
        intermediate_60=I_WL_60,
        advanced_30=A_WL_30,
        advanced_60=A_WL_60,
    ),
    "strength": goal_entry(
        "strength",
        "Strength + core plan",
        "Full-body strength with dedicated core work — progress reps before adding load.",
        beginner_30=STR_30,
        beginner_60=STR_60,
        intermediate_30=I_STR_30,
        intermediate_60=I_STR_60,
        advanced_30=A_STR_30,
        advanced_60=A_STR_60,
    ),
    "daily_fitness": goal_entry(
        "daily_fitness",
        "Daily fitness / general fitness plan",
        "Balanced strength, cardio, and mobility for everyday energy and health.",
        beginner_30=DF_30,
        beginner_60=DF_60,
        intermediate_30=I_DF_30,
        intermediate_60=I_DF_60,
        advanced_30=A_DF_30,
        advanced_60=A_DF_60,
    ),
}


def main() -> None:
    OUT.write_text(json.dumps(CATALOG, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
