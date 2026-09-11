from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import not_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.demo_accounts import LEGACY_DEMO_EMAIL_SUFFIX
from app.core.database import get_db
from app.core.security import create_access_token, decode_subject, hash_password, verify_password
from app.models.entities import Activity, Challenge, Squad, SquadMember, User, Zone
from app.schemas.common import (
    ActivityRead,
    BuddyConnectResponse,
    BuddyInviteCreate,
    BuddyInviteRead,
    BuddyUserRead,
    CoachChatRequest,
    CoachChatResponse,
    CompleteAssignmentResponse,
    CompetitionCreate,
    CompetitionRead,
    FitnessHistoryResponse,
    FitnessPlanGenerateRequest,
    FitnessPlanGenerateResponse,
    LeaderboardResponse,
    LoginRequest,
    MissionRead,
    NearbyPresenceResponse,
    ParticipateResponse,
    PresenceRead,
    PresenceUpdate,
    RedeemResponse,
    RewardRead,
    RewardRedemptionRead,
    SquadCreate,
    StartMissionPayload,
    StepSyncRequest,
    StepSyncResponse,
    TodayFitnessResponse,
    Token,
    UserCreate,
    UserRead,
)
from app.services.competition_service import create_competition, list_competitions, participate
from app.services.fitness_assignment_service import complete_assignment, get_assignment_history, get_today_assignments
from app.services.leaderboard_service import (
    get_competition_leaderboard,
    get_move_leaderboard,
    get_streak_leaderboard,
)
from app.services.mission_service import list_missions, verify_and_complete
from app.services.coach_chat_service import coach_chat
from app.services.plan_generation_service import generate_fitness_plan
from app.services.presence_service import list_nearby, upsert_presence
from app.services.progress_service import record_activity_progress
from app.services.reward_service import get_reward, list_redemption_history, list_rewards, redeem_reward
from app.services.buddy_service import accept_invite, decline_invite, list_buddies, list_incoming_invites, send_invite

api_router = APIRouter()
oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
oauth2_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

async def current_user(token: str = Depends(oauth2), db: AsyncSession = Depends(get_db)) -> User:
    subject = decode_subject(token)
    user = await db.get(User, int(subject)) if subject and subject.isdigit() else None
    if not user:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return user

async def optional_user(token: str | None = Depends(oauth2_optional), db: AsyncSession = Depends(get_db)) -> User | None:
    if not token:
        return None
    subject = decode_subject(token)
    if not subject or not subject.isdigit():
        return None
    return await db.get(User, int(subject))

@api_router.post("/auth/register", response_model=UserRead, status_code=201)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    if (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none():
        raise HTTPException(409, "Email already registered")
    user = User(
        email=payload.email,
        name=payload.name or payload.full_name or "MOVEGRID Mover",
        password_hash=hash_password(payload.password),
        fitness_level=payload.fitness_level or "Beginner",
        role="member",
    )
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



@api_router.post("/missions/{challenge_id}/start")
async def start_mission(
    challenge_id: int,
    payload: StartMissionPayload | None = None,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await db.get(Challenge, challenge_id):
        raise HTTPException(404, "Mission not found")
    initial_steps = payload.steps if (payload and payload.steps is not None) else 0
    if initial_steps > 0:
        user.steps = max(user.steps, initial_steps)
    activity = Activity(
        user_id=user.id,
        challenge_id=challenge_id,
        status="started",
        steps_count=initial_steps,
    )
    db.add(activity)
    await db.commit()
    await db.refresh(activity)
    return activity

@api_router.post("/daily-fitness/steps", response_model=StepSyncResponse)
@api_router.post("/steps", response_model=StepSyncResponse)
async def sync_steps(
    payload: StepSyncRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    user.steps = max(user.steps, payload.steps)
    if payload.active_minutes:
        user.active_minutes += payload.active_minutes
    progress = await record_activity_progress(db, user)
    await db.commit()
    return StepSyncResponse(
        steps=user.steps,
        total_points=user.total_points,
        streak=user.streak,
        streak_score=user.streak_score,
        streak_gained=progress["streak_gained"],
    )


@api_router.post("/missions/{challenge_id}/verify")
async def verify_mission(challenge_id: int, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    challenge = await db.get(Challenge, challenge_id)
    if not challenge or not challenge.is_active:
        raise HTTPException(404, "Mission not found")
    return {"verified": True, "challenge_id": challenge_id}

@api_router.post("/missions/{challenge_id}/complete")
async def complete(challenge_id: int, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await verify_and_complete(db, user, challenge_id)

@api_router.get("/missions/history", response_model=list[ActivityRead])
async def history(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return (await db.execute(select(Activity).where(Activity.user_id == user.id).order_by(Activity.started_at.desc()))).scalars().all()

@api_router.get("/daily-fitness/today", response_model=TodayFitnessResponse)
async def daily_fitness_today(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await get_today_assignments(db, user)

@api_router.post("/daily-fitness/{assignment_id}/complete", response_model=CompleteAssignmentResponse)
async def daily_fitness_complete(assignment_id: int, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await complete_assignment(db, user, assignment_id)

@api_router.get("/daily-fitness/history", response_model=FitnessHistoryResponse)
async def daily_fitness_history(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await get_assignment_history(db, user)


@api_router.post("/fitness-plan/generate", response_model=FitnessPlanGenerateResponse)
async def fitness_plan_generate(
    payload: FitnessPlanGenerateRequest,
    user: User | None = Depends(optional_user),
    db: AsyncSession = Depends(get_db),
):
    result = await generate_fitness_plan(payload.model_dump())
    if user:
        user.fitness_level = result["fitness_level"]
        await db.commit()
    return result


@api_router.post("/coach/chat", response_model=CoachChatResponse)
async def grid_coach_chat(
    payload: CoachChatRequest,
    user: User | None = Depends(optional_user),
):
    ctx = payload.context.model_dump() if payload.context else {}
    if user and not ctx.get("fitness_level"):
        ctx["fitness_level"] = user.fitness_level
    history = [{"role": m.role, "content": m.content} for m in payload.history]
    return await coach_chat(message=payload.message, history=history, context=ctx or None)


@api_router.get("/zones")
async def zones(db: AsyncSession = Depends(get_db)): return (await db.execute(select(Zone).where(Zone.is_active.is_(True)))).scalars().all()

@api_router.get("/zones/{zone_id}")
async def zone(zone_id: int, db: AsyncSession = Depends(get_db)):
    item = await db.get(Zone, zone_id)
    if not item: raise HTTPException(404, "Zone not found")
    return item

@api_router.post("/presence", response_model=PresenceRead)
async def update_presence(
    payload: PresenceUpdate,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    return await upsert_presence(db, user, payload)

@api_router.get("/presence/nearby", response_model=NearbyPresenceResponse)
async def nearby_presence(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_m: float = Query(800, ge=50, le=5000),
    user: User | None = Depends(optional_user),
    db: AsyncSession = Depends(get_db),
):
    return await list_nearby(
        db,
        latitude=latitude,
        longitude=longitude,
        radius_m=radius_m,
        current_user=user,
    )


@api_router.get("/buddies", response_model=list[BuddyUserRead])
async def buddies(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await list_buddies(db, user)


@api_router.get("/buddies/invites/incoming", response_model=list[BuddyInviteRead])
async def buddy_invites_incoming(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await list_incoming_invites(db, user)


@api_router.post("/buddies/invite", response_model=BuddyInviteRead, status_code=201)
async def buddy_invite(
    payload: BuddyInviteCreate,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    return await send_invite(db, user, payload.to_user_id, payload.message.strip())


@api_router.post("/buddies/invites/{invite_id}/accept", response_model=BuddyConnectResponse)
async def buddy_accept_invite(
    invite_id: int,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    return await accept_invite(db, user, invite_id)


@api_router.post("/buddies/invites/{invite_id}/decline")
async def buddy_decline_invite(
    invite_id: int,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    return await decline_invite(db, user, invite_id)


@api_router.get("/competitions", response_model=list[CompetitionRead])
async def competitions(user: User | None = Depends(optional_user), db: AsyncSession = Depends(get_db)):
    return await list_competitions(db, user)


@api_router.post("/competitions", response_model=CompetitionRead, status_code=201)
async def create_new_competition(
    payload: CompetitionCreate,
    user: User | None = Depends(optional_user),
    db: AsyncSession = Depends(get_db),
):
    return await create_competition(db, payload, user=user)


@api_router.post("/competitions/{competition_id}/participate", response_model=ParticipateResponse)
async def join_competition(
    competition_id: int,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    return await participate(db, user, competition_id)


@api_router.get("/leaderboard", response_model=LeaderboardResponse)
@api_router.get("/leaderboard/move", response_model=LeaderboardResponse)
async def move_leaderboard(
    limit: int = Query(20, ge=1, le=100),
    user: User | None = Depends(optional_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_move_leaderboard(db, current_user=user, limit=limit)

@api_router.get("/leaderboard/streak", response_model=LeaderboardResponse)
async def streak_leaderboard(
    limit: int = Query(20, ge=1, le=100),
    user: User | None = Depends(optional_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_streak_leaderboard(db, current_user=user, limit=limit)

@api_router.get("/leaderboard/competition", response_model=LeaderboardResponse)
async def competition_leaderboard(
    limit: int = Query(20, ge=1, le=100),
    user: User | None = Depends(optional_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_competition_leaderboard(db, current_user=user, limit=limit)

@api_router.get("/leaderboard/class")
async def class_leaderboard(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    users = (
        await db.execute(
            select(User)
            .where(
                User.class_id == user.class_id,
                User.role == "member",
                not_(User.email.ilike(f"%{LEGACY_DEMO_EMAIL_SUFFIX}")),
            )
            .order_by(User.total_points.desc())
        )
    ).scalars()
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
async def rewards(db: AsyncSession = Depends(get_db)):
    return await list_rewards(db, active_only=True)

@api_router.get("/rewards/history", response_model=list[RewardRedemptionRead])
async def reward_history(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await list_redemption_history(db, user)

@api_router.get("/rewards/{reward_id}", response_model=RewardRead)
async def reward_detail(reward_id: int, db: AsyncSession = Depends(get_db)):
    return await get_reward(db, reward_id, require_active=True)

@api_router.post("/rewards/{reward_id}/redeem", response_model=RedeemResponse)
async def redeem(reward_id: int, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await redeem_reward(db, user, reward_id)
