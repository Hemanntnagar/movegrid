"""Shared progress updates after missions / fitness completions."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Team, User
from app.services.leaderboard_service import refresh_all_leaderboard_ranks


def _month_key(day: date | None = None) -> str:
    moment = day or date.today()
    return f"{moment.year:04d}-{moment.month:02d}"


def ensure_monthly_streak_window(user: User, today: date | None = None) -> None:
    """Reset monthly streak score when the calendar month rolls over."""
    moment = today or date.today()
    key = _month_key(moment)
    if user.streak_month != key:
        user.streak_month = key
        user.streak_score = 0


def apply_daily_streak(user: User, today: date | None = None) -> int:
    """Update consecutive-day streak and monthly streak score.

    Returns points added to streak_score for this activity day.
    Completing multiple activities on the same day only awards streak score once.
    """
    moment = today or date.today()
    ensure_monthly_streak_window(user, moment)

    if user.last_activity_date == moment:
        return 0

    if user.last_activity_date == moment - timedelta(days=1):
        user.streak = max(1, user.streak + 1)
    else:
        user.streak = 1

    gained = max(10, user.streak * 5)
    user.streak_score += gained
    user.last_activity_date = moment
    return gained


async def award_competition_points(db: AsyncSession, user: User, points: int) -> None:
    if points <= 0 or not user.team_id:
        return
    team = await db.get(Team, user.team_id)
    if team:
        team.competition_points += points


async def record_activity_progress(
    db: AsyncSession,
    user: User,
    *,
    move_awarded: int = 0,
    active_minutes: int = 0,
    now: datetime | None = None,
) -> dict:
    """Apply MOVE, streak score, team competition points, then refresh ranks."""
    moment = now or _utcnow()
    today = moment.date()

    if move_awarded:
        user.total_points += move_awarded
    if active_minutes:
        user.active_minutes += active_minutes

    streak_gained = apply_daily_streak(user, today)
    await award_competition_points(db, user, move_awarded)
    await db.flush()
    await refresh_all_leaderboard_ranks(db)

    return {
        "move_awarded": move_awarded,
        "streak": user.streak,
        "streak_score": user.streak_score,
        "streak_gained": streak_gained,
        "total_points": user.total_points,
    }
