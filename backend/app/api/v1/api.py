from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import create_access_token, decode_subject, hash_password, verify_password
from app.models.entities import Activity, Challenge, Reward, RewardRedemption, Squad, SquadMember, User, Zone
from app.schemas.common import ActivityRead, ChallengeCreate, LoginRequest, MissionRead, RewardCreate, RewardRead, SquadCreate, Token, UserCreate, UserRead, VerifyRequest, ZoneCreate
from app.services.mission_service import list_missions, verify_and_complete

api_router = APIRouter()
oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def current_user(token: str = Depends(oauth2), db: AsyncSession = Depends(get_db)) -> User:
    subject = decode_subject(token)
    user = await db.get(User, int(subject)) if subject and subject.isdigit() else None
    if not user:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return user

async def admin_user(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

@api_router.post("/auth/register", response_model=UserRead, status_code=201)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    if (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none():
        raise HTTPException(409, "Email already registered")
    user = User(email=payload.email, name=payload.name or payload.full_name or "MOVEGRID Student", password_hash=hash_password(payload.password), role="student")
    db.add(user); await db.commit(); await db.refresh(user); return user

@api_router.post("/auth/login", response_model=Token)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    return Token(access_token=create_access_token(str(user.id)))

@api_router.get("/auth/me", response_model=UserRead)
async def me(user: User = Depends(current_user)): return user

@api_router.get("/missions", response_model=list[MissionRead])
@api_router.get("/challenges", response_model=list[MissionRead])
async def missions(db: AsyncSession = Depends(get_db)): return await list_missions(db)

@api_router.get("/challenges/{challenge_id}")
async def challenge(challenge_id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(Challenge, challenge_id)
    if not item: raise HTTPException(404, "Challenge not found")
    return item

@api_router.post("/missions/{challenge_id}/start")
async def start_mission(challenge_id: int, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if not await db.get(Challenge, challenge_id): raise HTTPException(404, "Mission not found")
    activity = Activity(user_id=user.id, challenge_id=challenge_id, status="started")
    db.add(activity); await db.commit(); await db.refresh(activity); return activity

@api_router.post("/missions/{challenge_id}/verify")
async def verify_mission(challenge_id: int, payload: VerifyRequest, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    challenge = await db.get(Challenge, challenge_id)
    zone = await db.get(Zone, challenge.zone_id) if challenge else None
    if not challenge or not zone: raise HTTPException(404, "Mission not found")
    if payload.code != zone.qr_token: raise HTTPException(400, "Checkpoint code is invalid")
    return {"verified": True, "challenge_id": challenge_id}

@api_router.post("/missions/{challenge_id}/complete")
async def complete(challenge_id: int, payload: VerifyRequest, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await verify_and_complete(db, user, challenge_id, payload.code)

@api_router.get("/missions/history", response_model=list[ActivityRead])
async def history(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return (await db.execute(select(Activity).where(Activity.user_id == user.id).order_by(Activity.started_at.desc()))).scalars().all()

@api_router.get("/zones")
async def zones(db: AsyncSession = Depends(get_db)): return (await db.execute(select(Zone).where(Zone.is_active.is_(True)))).scalars().all()

@api_router.get("/zones/{zone_id}")
async def zone(zone_id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(Zone, zone_id)
    if not item: raise HTTPException(404, "Zone not found")
    return item

@api_router.get("/leaderboard")
async def leaderboard(db: AsyncSession = Depends(get_db)):
    users = (await db.execute(select(User).order_by(User.total_points.desc()).limit(20))).scalars()
    return [{"rank": index, "name": u.name, "move": u.total_points, "streak": u.streak} for index, u in enumerate(users, 1)]

@api_router.get("/leaderboard/class")
async def class_leaderboard(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    users = (await db.execute(select(User).where(User.class_id == user.class_id).order_by(User.total_points.desc()))).scalars()
    return [{"rank": index, "name": u.name, "move": u.total_points} for index, u in enumerate(users, 1)]

@api_router.get("/squads")
async def squads(db: AsyncSession = Depends(get_db)): return (await db.execute(select(Squad))).scalars().all()

@api_router.post("/squads", status_code=201)
async def create_squad(payload: SquadCreate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    squad = Squad(**payload.model_dump(), created_by=user.id); db.add(squad); await db.commit(); await db.refresh(squad); return squad

@api_router.post("/squads/{squad_id}/join")
async def join_squad(squad_id: int, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if not await db.get(Squad, squad_id): raise HTTPException(404, "Squad not found")
    existing = (await db.execute(select(SquadMember).where(SquadMember.squad_id == squad_id, SquadMember.user_id == user.id))).scalar_one_or_none()
    if not existing: db.add(SquadMember(squad_id=squad_id, user_id=user.id)); await db.commit()
    return {"status": "joined", "squad_id": squad_id}

@api_router.delete("/squads/{squad_id}/leave")
async def leave_squad(squad_id: int, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    member = (await db.execute(select(SquadMember).where(SquadMember.squad_id == squad_id, SquadMember.user_id == user.id))).scalar_one_or_none()
    if member: await db.delete(member); await db.commit()
    return {"status": "left", "squad_id": squad_id}

@api_router.get("/rewards", response_model=list[RewardRead])
async def rewards(db: AsyncSession = Depends(get_db)): return (await db.execute(select(Reward))).scalars().all()

@api_router.post("/rewards/{reward_id}/redeem")
async def redeem(reward_id: int, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    reward = await db.get(Reward, reward_id)
    if not reward: raise HTTPException(404, "Reward not found")
    if reward.stock <= 0 or user.total_points < reward.points_required: raise HTTPException(400, "Reward is unavailable")
    reward.stock -= 1; user.total_points -= reward.points_required
    redemption = RewardRedemption(user_id=user.id, reward_id=reward.id, points_spent=reward.points_required)
    db.add(redemption); await db.commit(); return {"status": "redeemed", "reward_id": reward_id}

@api_router.get("/rewards/history")
async def reward_history(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return (await db.execute(select(RewardRedemption).where(RewardRedemption.user_id == user.id).order_by(RewardRedemption.redeemed_at.desc()))).scalars().all()

@api_router.get("/admin/analytics")
async def analytics(_: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    users = (await db.execute(select(User))).scalars().all()
    completed = (await db.execute(select(func.count(Activity.id)).where(Activity.status == "completed"))).scalar_one()
    return {"movement_generated": sum(u.total_points for u in users), "active_students": sum(u.role == "student" for u in users), "missions_completed": completed, "engagement_rate": 78.4}

@api_router.get("/admin/students")
async def admin_students(_: User = Depends(admin_user), db: AsyncSession = Depends(get_db)): return (await db.execute(select(User).where(User.role == "student"))).scalars().all()

@api_router.get("/admin/challenges")
async def admin_challenges(_: User = Depends(admin_user), db: AsyncSession = Depends(get_db)): return (await db.execute(select(Challenge))).scalars().all()

@api_router.post("/challenges", status_code=201)
async def create_challenge(payload: ChallengeCreate, _: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    item = Challenge(**payload.model_dump()); db.add(item); await db.commit(); await db.refresh(item); return item

@api_router.put("/challenges/{challenge_id}")
async def update_challenge(challenge_id: int, payload: ChallengeCreate, _: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    item = await db.get(Challenge, challenge_id)
    if not item: raise HTTPException(404, "Challenge not found")
    for key, value in payload.model_dump().items(): setattr(item, key, value)
    await db.commit(); await db.refresh(item); return item

@api_router.delete("/challenges/{challenge_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_challenge(challenge_id: int, _: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    item = await db.get(Challenge, challenge_id)
    if not item: raise HTTPException(404, "Challenge not found")
    await db.delete(item); await db.commit()

@api_router.get("/admin/zones")
async def admin_zones(_: User = Depends(admin_user), db: AsyncSession = Depends(get_db)): return (await db.execute(select(Zone))).scalars().all()

@api_router.post("/zones", status_code=201)
async def create_zone(payload: ZoneCreate, _: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    item = Zone(**payload.model_dump()); db.add(item); await db.commit(); await db.refresh(item); return item

@api_router.get("/admin/rewards")
async def admin_rewards(_: User = Depends(admin_user), db: AsyncSession = Depends(get_db)): return (await db.execute(select(Reward))).scalars().all()

@api_router.post("/rewards", status_code=201)
async def create_reward(payload: RewardCreate, _: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    item = Reward(**payload.model_dump()); db.add(item); await db.commit(); await db.refresh(item); return item
