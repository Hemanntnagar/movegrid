from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import hash_password
from app.models.entities import Challenge, Reward, User, Zone

async def seed_demo_data(db: AsyncSession) -> None:
    existing = (await db.execute(select(User).where(User.email == "student@movegrid.demo"))).scalar_one_or_none()
    if not existing:
        db.add_all([
            User(email="student@movegrid.demo", name="Alex Morgan", password_hash=hash_password("movegrid-demo"), role="student", total_points=1240, streak=7, active_minutes=86),
            User(email="admin@movegrid.demo", name="MOVEGRID Admin", password_hash=hash_password("movegrid-demo"), role="admin"),
        ])
    zone = (await db.execute(select(Zone).limit(1))).scalar_one_or_none()
    if not zone:
        zone = Zone(name="Central Green", description="The campus movement hub", latitude=40.7128, longitude=-74.006, qr_token="movegrid-demo")
        db.add(zone)
        await db.flush()
        db.add_all([
            Challenge(title="Loop the Green", description="Complete one lap around Central Green.", type="Walk", difficulty="Easy", duration_minutes=12, reward_points=120, zone_id=zone.id),
            Challenge(title="Stair Sprint", description="Take the stairs to the top of the student center.", type="Stairs", difficulty="Medium", duration_minutes=8, reward_points=180, zone_id=zone.id),
        ])
    reward = (await db.execute(select(Reward).limit(1))).scalar_one_or_none()
    if not reward:
        db.add_all([
            Reward(title="Campus Coffee", description="A coffee from the campus cafe.", points_required=500, stock=20),
            Reward(title="MOVEGRID Tee", description="Limited edition campus movement tee.", points_required=1500, stock=8),
        ])
    await db.commit()
