from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import create_access_token, decode_subject, hash_password, verify_password
from app.models.entities import Reward, User
from app.schemas.common import MissionRead, RewardRead, Token, UserCreate, UserRead, VerifyRequest
from app.services.mission_service import list_missions, verify_and_complete

api_router = APIRouter()
oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def current_user(token: str = Depends(oauth2), db: AsyncSession = Depends(get_db)) -> User:
    subject = decode_subject(token)
    user = await db.get(User, int(subject)) if subject and subject.isdigit() else None
    if not user: raise HTTPException(401, "Invalid authentication credentials")
    return user

@api_router.post("/auth/register", response_model=UserRead)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    if (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none(): raise HTTPException(409, "Email already registered")
    user = User(email=payload.email, full_name=payload.full_name, password_hash=hash_password(payload.password))
    db.add(user); await db.commit(); await db.refresh(user); return user

@api_router.post("/auth/login", response_model=Token)
async def login(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash): raise HTTPException(401, "Invalid email or password")
    return Token(access_token=create_access_token(str(user.id)))

@api_router.get("/auth/me", response_model=UserRead)
async def me(user: User = Depends(current_user)): return user

@api_router.get("/missions", response_model=list[MissionRead])
async def missions(db: AsyncSession = Depends(get_db)): return await list_missions(db)

@api_router.post("/missions/{challenge_id}/complete")
async def complete(challenge_id: int, payload: VerifyRequest, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)): return await verify_and_complete(db, user, challenge_id, payload.code)

@api_router.get("/rewards", response_model=list[RewardRead])
async def rewards(db: AsyncSession = Depends(get_db)): return (await db.execute(select(Reward))).scalars().all()

@api_router.get("/leaderboard")
async def leaderboard(db: AsyncSession = Depends(get_db)): return [{"name": u.full_name, "move": u.move_points} for u in (await db.execute(select(User).order_by(User.move_points.desc()).limit(20))).scalars()]

@api_router.get("/admin/analytics")
async def analytics(db: AsyncSession = Depends(get_db)):
    users = (await db.execute(select(User))).scalars().all()
    return {"movement_generated": sum(u.move_points for u in users), "active_students": len(users), "missions_completed": 0, "engagement_rate": 78.4}
