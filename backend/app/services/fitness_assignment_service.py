"""Daily personalized fitness assignment engine.

Assignments always expire after exactly 24 hours. Call expire_due_assignments()
from request paths and from a future scheduled background job.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from random import Random

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.entities import DailyAssignment, Exercise, User
from app.services.progress_service import record_activity_progress

ASSIGNMENT_TTL = timedelta(hours=24)
ASSIGNMENTS_PER_DAY = 3
RECENT_LOOKBACK_DAYS = 7
STATUS_ASSIGNED = "ASSIGNED"
STATUS_COMPLETED = "COMPLETED"
STATUS_EXPIRED = "EXPIRED"

LEVEL_ALIASES = {
    "beginner": "Beginner",
    "easy": "Beginner",
    "intermediate": "Intermediate",
    "medium": "Intermediate",
    "advanced": "Advanced",
    "hard": "Advanced",
}


def _utcnow() -> datetime:
    return datetime.utcnow()


def _normalize_level(raw: str | None) -> str:
    if not raw:
        return "Beginner"
    return LEVEL_ALIASES.get(raw.strip().lower(), raw.strip().title())


async def expire_due_assignments(
    db: AsyncSession,
    *,
    user_id: int | None = None,
    now: datetime | None = None,
) -> int:
    """Mark overdue ASSIGNED rows as EXPIRED. Safe for request-time and cron use."""
    moment = now or _utcnow()
    query = select(DailyAssignment).where(
        DailyAssignment.status == STATUS_ASSIGNED,
        DailyAssignment.expires_at <= moment,
    )
    if user_id is not None:
        query = query.where(DailyAssignment.user_id == user_id)
    rows = (await db.execute(query)).scalars().all()
    for row in rows:
        row.status = STATUS_EXPIRED
    if rows:
        await db.flush()
    return len(rows)


async def _recent_exercise_ids(db: AsyncSession, user_id: int, now: datetime) -> set[int]:
    since = now - timedelta(days=RECENT_LOOKBACK_DAYS)
    rows = (
        await db.execute(
            select(DailyAssignment.exercise_id).where(
                DailyAssignment.user_id == user_id,
                DailyAssignment.assigned_at >= since,
            )
        )
    ).scalars().all()
    return set(rows)


async def _current_window_assignments(
    db: AsyncSession,
    user_id: int,
    now: datetime,
) -> list[DailyAssignment]:
    """Return the latest assignment batch if its 24-hour window is still open."""
    latest = (
        await db.execute(
            select(DailyAssignment)
            .where(DailyAssignment.user_id == user_id)
            .order_by(DailyAssignment.assigned_at.desc(), DailyAssignment.id.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if not latest:
        return []
    if latest.expires_at <= now:
        return []

    rows = (
        await db.execute(
            select(DailyAssignment)
            .where(
                DailyAssignment.user_id == user_id,
                DailyAssignment.assigned_at == latest.assigned_at,
            )
            .order_by(DailyAssignment.id.asc())
        )
    ).scalars().all()
    return list(rows)


async def _select_exercises(
    db: AsyncSession,
    *,
    fitness_level: str,
    user_id: int,
    now: datetime,
    count: int = ASSIGNMENTS_PER_DAY,
) -> list[Exercise]:
    level = _normalize_level(fitness_level)
    pool = (
        await db.execute(
            select(Exercise).where(
                Exercise.is_active.is_(True),
                Exercise.requires_equipment.is_(False),
                Exercise.difficulty == level,
            )
        )
    ).scalars().all()
    if not pool:
        pool = (
            await db.execute(
                select(Exercise).where(
                    Exercise.is_active.is_(True),
                    Exercise.requires_equipment.is_(False),
                )
            )
        ).scalars().all()
    if not pool:
        raise HTTPException(503, "No exercises available for assignment")

    recent = await _recent_exercise_ids(db, user_id, now)
    fresh = [ex for ex in pool if ex.id not in recent]
    candidates = fresh or pool

    rng = Random(f"{user_id}:{now.date().isoformat()}:{level}")
    rng.shuffle(candidates)

    selected: list[Exercise] = []
    used_categories: set[str] = set()
    for exercise in candidates:
        if len(selected) >= count:
            break
        if exercise.category in used_categories and len(candidates) >= count:
            continue
        selected.append(exercise)
        used_categories.add(exercise.category)

    if len(selected) < count:
        for exercise in candidates:
            if exercise not in selected:
                selected.append(exercise)
            if len(selected) >= count:
                break

    return selected[:count]


async def create_daily_assignments(
    db: AsyncSession,
    user: User,
    *,
    now: datetime | None = None,
) -> list[DailyAssignment]:
    moment = now or _utcnow()
    exercises = await _select_exercises(
        db,
        fitness_level=user.fitness_level,
        user_id=user.id,
        now=moment,
    )
    expires_at = moment + ASSIGNMENT_TTL
    created: list[DailyAssignment] = []
    for exercise in exercises:
        row = DailyAssignment(
            user_id=user.id,
            exercise_id=exercise.id,
            assigned_at=moment,
            expires_at=expires_at,
            status=STATUS_ASSIGNED,
            points=exercise.points,
        )
        db.add(row)
        created.append(row)
    await db.flush()
    for row in created:
        await db.refresh(row)
    return created


async def get_today_assignments(db: AsyncSession, user: User) -> dict:
    now = _utcnow()
    expired_count = await expire_due_assignments(db, user_id=user.id, now=now)
    batch = await _current_window_assignments(db, user.id, now)
    if not batch:
        batch = await create_daily_assignments(db, user, now=now)
    await db.commit()

    assignment_ids = [row.id for row in batch]
    rows = (
        await db.execute(
            select(DailyAssignment, Exercise)
            .join(Exercise, DailyAssignment.exercise_id == Exercise.id)
            .where(DailyAssignment.id.in_(assignment_ids))
            .order_by(DailyAssignment.id.asc())
        )
    ).all()

    assignments = [_serialize_assignment(assignment, exercise, now) for assignment, exercise in rows]
    assigned = [item for item in assignments if item["status"] == STATUS_ASSIGNED]
    completed = [item for item in assignments if item["status"] == STATUS_COMPLETED]
    total = len(assignments)
    done = len(completed)
    points_available = sum(item["points"] for item in assigned)
    points_earned = sum(item["points"] for item in completed)
    expires_at = min((item["expires_at"] for item in assignments), default=None)

    return {
        "fitness_level": _normalize_level(user.fitness_level),
        "total_points": user.total_points,
        "progress": {
            "completed": done,
            "total": total,
            "percent": int(round((done / total) * 100)) if total else 0,
            "points_available": points_available,
            "points_earned": points_earned,
        },
        "expires_at": expires_at,
        "seconds_remaining": max(0, int((expires_at - now).total_seconds())) if expires_at else 0,
        "expired_just_now": expired_count,
        "assignments": assignments,
        "assigned": assigned,
        "completed": completed,
    }


async def complete_assignment(db: AsyncSession, user: User, assignment_id: int) -> dict:
    now = _utcnow()
    await expire_due_assignments(db, user_id=user.id, now=now)

    assignment = await db.get(DailyAssignment, assignment_id)
    if not assignment or assignment.user_id != user.id:
        raise HTTPException(404, "Assignment not found")
    if assignment.status == STATUS_COMPLETED:
        raise HTTPException(400, "Assignment already completed")
    if assignment.status == STATUS_EXPIRED or assignment.expires_at <= now:
        assignment.status = STATUS_EXPIRED
        await db.commit()
        raise HTTPException(400, "Assignment has expired")
    if assignment.status != STATUS_ASSIGNED:
        raise HTTPException(400, "Assignment cannot be completed")

    exercise = await db.get(Exercise, assignment.exercise_id)
    award = assignment.points
    assignment.status = STATUS_COMPLETED
    assignment.completed_at = now
    minutes = exercise.duration_minutes if exercise else 0
    progress = await record_activity_progress(
        db,
        user,
        move_awarded=award,
        active_minutes=minutes,
        now=now,
    )
    await db.commit()

    return {
        "status": STATUS_COMPLETED,
        "assignment_id": assignment.id,
        "points_awarded": award,
        "total_points": user.total_points,
        "streak": user.streak,
        "streak_score": user.streak_score,
        "streak_gained": progress["streak_gained"],
        "exercise_name": exercise.name if exercise else None,
        "completed_at": assignment.completed_at,
    }


async def get_assignment_history(db: AsyncSession, user: User, *, limit: int = 50) -> dict:
    now = _utcnow()
    await expire_due_assignments(db, user_id=user.id, now=now)
    await db.commit()

    rows = (
        await db.execute(
            select(DailyAssignment, Exercise)
            .join(Exercise, DailyAssignment.exercise_id == Exercise.id)
            .where(DailyAssignment.user_id == user.id)
            .order_by(DailyAssignment.assigned_at.desc(), DailyAssignment.id.desc())
            .limit(limit)
        )
    ).all()

    items = [_serialize_assignment(assignment, exercise, now) for assignment, exercise in rows]
    return {
        "total_points": user.total_points,
        "items": items,
        "completed": [item for item in items if item["status"] == STATUS_COMPLETED],
        "expired": [item for item in items if item["status"] == STATUS_EXPIRED],
        "assigned": [item for item in items if item["status"] == STATUS_ASSIGNED],
    }


def _serialize_assignment(assignment: DailyAssignment, exercise: Exercise, now: datetime) -> dict:
    seconds_remaining = 0
    if assignment.status == STATUS_ASSIGNED:
        seconds_remaining = max(0, int((assignment.expires_at - now).total_seconds()))
    return {
        "id": assignment.id,
        "user_id": assignment.user_id,
        "exercise_id": assignment.exercise_id,
        "assigned_at": assignment.assigned_at,
        "expires_at": assignment.expires_at,
        "status": assignment.status,
        "points": assignment.points,
        "completed_at": assignment.completed_at,
        "seconds_remaining": seconds_remaining,
        "exercise": {
            "id": exercise.id,
            "name": exercise.name,
            "description": exercise.description,
            "category": exercise.category,
            "difficulty": exercise.difficulty,
            "duration_minutes": exercise.duration_minutes,
            "target_reps": exercise.target_reps,
            "instructions": exercise.instructions,
            "points": exercise.points,
        },
    }
