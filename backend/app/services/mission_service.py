from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.entities import Activity, Challenge, User, Zone

async def list_missions(db: AsyncSession) -> list[dict]:
    rows = (await db.execute(select(Challenge, Zone).join(Zone, Challenge.zone_id == Zone.id).where(Challenge.is_active.is_(True)))).all()
    return [{"id": c.id, "title": c.title, "description": c.description, "zone": z.name, "move_reward": c.move_reward, "minutes": c.minutes, "kind": c.kind} for c, z in rows]

async def verify_and_complete(db: AsyncSession, user: User, challenge_id: int, code: str) -> dict:
    challenge = await db.get(Challenge, challenge_id)
    if not challenge:
        raise HTTPException(404, "Mission not found")
    zone = await db.get(Zone, challenge.zone_id)
    if code != zone.qr_secret:
        raise HTTPException(400, "Checkpoint code is invalid")
    activity = Activity(user_id=user.id, challenge_id=challenge.id, status="completed", move_awarded=challenge.move_reward)
    user.move_points += challenge.move_reward
    user.streak = max(1, user.streak + 1)
    db.add(activity)
    await db.commit()
    return {"status": "completed", "move_awarded": challenge.move_reward, "move_points": user.move_points, "streak": user.streak}
