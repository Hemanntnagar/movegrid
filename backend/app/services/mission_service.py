from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Activity, Challenge, User, Zone
from app.services.progress_service import record_activity_progress


async def list_missions(db: AsyncSession) -> list[dict]:
    rows = (
        await db.execute(
            select(Challenge, Zone)
            .join(Zone, Challenge.zone_id == Zone.id)
            .where(Challenge.is_active.is_(True))
        )
    ).all()
    return [
        {
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "zone": z.name,
            "move_reward": c.move_reward,
            "minutes": c.minutes,
            "kind": c.kind,
        }
        for c, z in rows
    ]


async def verify_and_complete(db: AsyncSession, user: User, challenge_id: int) -> dict:
    challenge = await db.get(Challenge, challenge_id)
    if not challenge or not challenge.is_active:
        raise HTTPException(404, "Mission not found")

    now = datetime.utcnow()
    award = challenge.reward_points
    activity = Activity(
        user_id=user.id,
        challenge_id=challenge.id,
        status="completed",
        points_earned=award,
        completed_at=now,
        verification_status="verified",
    )
    db.add(activity)
    progress = await record_activity_progress(
        db,
        user,
        move_awarded=award,
        active_minutes=challenge.duration_minutes,
        now=now,
    )
    await db.commit()
    return {
        "status": "completed",
        "move_awarded": award,
        "move_points": user.total_points,
        "streak": user.streak,
        "streak_score": user.streak_score,
        "streak_gained": progress["streak_gained"],
    }
