"""Competition listing and participation."""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.demo_competitions import LEGACY_DEMO_COMPETITION_NAMES
from app.models.entities import Competition, CompetitionParticipant, User
from app.schemas.common import CompetitionCreate

_LEGACY_DEMO_NAMES = frozenset(LEGACY_DEMO_COMPETITION_NAMES)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _naive_utc(dt: datetime) -> datetime:
    """Store as naive UTC for PostgreSQL timestamp columns (asyncpg rejects mixed tz)."""
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def _status_for(comp: Competition, now: datetime) -> str:
    if comp.ends_at and now > comp.ends_at:
        return "ended"
    if now < comp.starts_at:
        return "upcoming"
    return "live"


def _eligible(user: User | None, comp: Competition) -> bool:
    if not user:
        return False
    if user.total_points < comp.min_points:
        return False
    if user.streak < comp.min_streak:
        return False
    return True


def serialize_competition(
    comp: Competition,
    *,
    user: User | None,
    participating_ids: set[int],
    now: datetime | None = None,
) -> dict:
    now = now or _utcnow()
    status = _status_for(comp, now)
    eligible = _eligible(user, comp) and status != "ended" and comp.is_active
    return {
        "id": comp.id,
        "name": comp.name,
        "company_name": getattr(comp, "company_name", "") or "",
        "venue": getattr(comp, "venue", "") or "",
        "description": comp.description,
        "reward": getattr(comp, "reward", "") or "",
        "eligibility": comp.eligibility,
        "min_points": comp.min_points,
        "min_streak": comp.min_streak,
        "starts_at": comp.starts_at,
        "ends_at": comp.ends_at,
        "is_active": comp.is_active,
        "status": status,
        "eligible": eligible,
        "is_participating": comp.id in participating_ids,
        "participant_count": None,
    }


async def create_competition(db: AsyncSession, payload: CompetitionCreate, user: User | None = None) -> dict:
    now = _utcnow()
    starts_at = _naive_utc(payload.starts_at) if payload.starts_at else now
    ends_at = _naive_utc(payload.ends_at)
    if ends_at <= starts_at:
        raise HTTPException(400, "End date must be after the start date")
    comp = Competition(
        name=payload.name,
        company_name=payload.company_name or "",
        venue=payload.venue or "",
        description=payload.description or "",
        reward=payload.reward or "",
        eligibility=payload.eligibility or "Open to all members",
        min_points=payload.min_points,
        min_streak=payload.min_streak,
        starts_at=starts_at,
        ends_at=ends_at,
        is_active=True,
    )
    db.add(comp)
    await db.commit()
    await db.refresh(comp)

    participating_ids: set[int] = set()
    item = serialize_competition(comp, user=user, participating_ids=participating_ids, now=now)
    item["participant_count"] = 0
    return item


async def list_competitions(db: AsyncSession, user: User | None = None) -> list[dict]:
    now = _utcnow()
    comps = (
        await db.execute(
            select(Competition)
            .where(
                Competition.is_active.is_(True),
                Competition.ends_at.isnot(None),
                Competition.ends_at > now,
            )
            .order_by(Competition.starts_at.asc(), Competition.id.asc())
        )
    ).scalars().all()
    participating_ids: set[int] = set()
    if user:
        rows = (
            await db.execute(
                select(CompetitionParticipant.competition_id).where(CompetitionParticipant.user_id == user.id)
            )
        ).all()
        participating_ids = {row[0] for row in rows}

    results = []
    for comp in comps:
        if comp.name in _LEGACY_DEMO_NAMES:
            continue
        item = serialize_competition(comp, user=user, participating_ids=participating_ids, now=now)
        count = (
            await db.execute(
                select(CompetitionParticipant.id).where(CompetitionParticipant.competition_id == comp.id)
            )
        ).all()
        item["participant_count"] = len(count)
        results.append(item)
    return results


async def participate(db: AsyncSession, user: User, competition_id: int) -> dict:
    comp = await db.get(Competition, competition_id)
    if not comp or not comp.is_active:
        raise HTTPException(404, "Competition not found")

    now = _utcnow()
    status = _status_for(comp, now)
    if status == "ended":
        raise HTTPException(400, "This competition has ended")
    if not _eligible(user, comp):
        parts = []
        if comp.min_points:
            parts.append(f"{comp.min_points}+ MOVE")
        if comp.min_streak:
            parts.append(f"{comp.min_streak}+ day streak")
        need = " and ".join(parts) if parts else "the eligibility rules"
        raise HTTPException(400, f"You are not eligible yet — need {need}")

    existing = (
        await db.execute(
            select(CompetitionParticipant).where(
                CompetitionParticipant.competition_id == competition_id,
                CompetitionParticipant.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if not existing:
        db.add(CompetitionParticipant(competition_id=competition_id, user_id=user.id, joined_at=now))
        await db.commit()

    participating_ids = {competition_id}
    item = serialize_competition(comp, user=user, participating_ids=participating_ids, now=now)
    count = (
        await db.execute(
            select(CompetitionParticipant.id).where(CompetitionParticipant.competition_id == competition_id)
        )
    ).all()
    item["participant_count"] = len(count)
    item["is_participating"] = True
    return {"status": "joined", "competition": item}
