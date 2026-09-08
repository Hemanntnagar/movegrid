"""Backend-owned leaderboard ranking queries and rank delta tracking."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import LeaderboardRank, Team, User

BOARD_MOVE = "move"
BOARD_STREAK = "streak"
BOARD_COMPETITION = "competition"
SUBJECT_USER = "user"
SUBJECT_TEAM = "team"


async def refresh_board_ranks(
    db: AsyncSession,
    *,
    board: str,
    subject_type: str,
    ordered_ids_and_points: list[tuple[int, int]],
) -> None:
    """Persist current ranks and compute movement vs previous ranks."""
    now = datetime.utcnow()
    existing = (
        await db.execute(
            select(LeaderboardRank).where(
                LeaderboardRank.board == board,
                LeaderboardRank.subject_type == subject_type,
            )
        )
    ).scalars().all()
    by_id = {row.subject_id: row for row in existing}
    seen: set[int] = set()

    for rank, (subject_id, points) in enumerate(ordered_ids_and_points, start=1):
        seen.add(subject_id)
        row = by_id.get(subject_id)
        if row is None:
            row = LeaderboardRank(
                board=board,
                subject_type=subject_type,
                subject_id=subject_id,
                rank=rank,
                previous_rank=None,
                points=points,
                updated_at=now,
            )
            db.add(row)
        else:
            if row.rank != rank:
                row.previous_rank = row.rank
            row.rank = rank
            row.points = points
            row.updated_at = now

    for subject_id, row in by_id.items():
        if subject_id not in seen:
            await db.delete(row)

    await db.flush()


async def refresh_all_leaderboard_ranks(db: AsyncSession) -> None:
    users = (
        await db.execute(
            select(User.id, User.total_points)
            .where(User.role == "member")
            .order_by(User.total_points.desc(), User.id.asc())
        )
    ).all()
    await refresh_board_ranks(
        db,
        board=BOARD_MOVE,
        subject_type=SUBJECT_USER,
        ordered_ids_and_points=[(row.id, row.total_points) for row in users],
    )

    streak_users = (
        await db.execute(
            select(User.id, User.streak)
            .where(User.role == "member")
            .order_by(User.streak.desc(), User.id.asc())
        )
    ).all()
    await refresh_board_ranks(
        db,
        board=BOARD_STREAK,
        subject_type=SUBJECT_USER,
        ordered_ids_and_points=[(row.id, row.streak) for row in streak_users],
    )

    teams = (
        await db.execute(
            select(Team.id, Team.competition_points).order_by(
                Team.competition_points.desc(),
                Team.id.asc(),
            )
        )
    ).all()
    await refresh_board_ranks(
        db,
        board=BOARD_COMPETITION,
        subject_type=SUBJECT_TEAM,
        ordered_ids_and_points=[(row.id, row.competition_points) for row in teams],
    )


def _movement(rank: int, previous_rank: int | None) -> int:
    if previous_rank is None:
        return 0
    return previous_rank - rank


async def _rank_lookup(db: AsyncSession, board: str, subject_type: str) -> dict[int, LeaderboardRank]:
    rows = (
        await db.execute(
            select(LeaderboardRank).where(
                LeaderboardRank.board == board,
                LeaderboardRank.subject_type == subject_type,
            )
        )
    ).scalars().all()
    return {row.subject_id: row for row in rows}


async def get_move_leaderboard(
    db: AsyncSession,
    *,
    current_user: User | None,
    limit: int = 20,
) -> dict:
    limit = max(1, min(limit, 100))
    users = (
        await db.execute(
            select(User)
            .where(User.role == "member")
            .order_by(User.total_points.desc(), User.id.asc())
        )
    ).scalars().all()
    ranks = await _rank_lookup(db, BOARD_MOVE, SUBJECT_USER)

    entries = []
    me_entry = None
    for index, user in enumerate(users, start=1):
        rank_row = ranks.get(user.id)
        entry = {
            "rank": index,
            "id": user.id,
            "name": user.name,
            "avatar": user.avatar,
            "points": user.total_points,
            "movement": _movement(index, rank_row.previous_rank if rank_row else None),
            "is_current_user": bool(current_user and current_user.id == user.id),
            "meta": {"streak": user.streak},
        }
        if index <= limit:
            entries.append(entry)
        if current_user and current_user.id == user.id:
            me_entry = entry

    return {
        "board": BOARD_MOVE,
        "title": "MOVE leaderboard",
        "metric_label": "MOVE",
        "limit": limit,
        "total_participants": len(users),
        "entries": entries,
        "me": me_entry,
    }


async def get_streak_leaderboard(
    db: AsyncSession,
    *,
    current_user: User | None,
    limit: int = 20,
) -> dict:
    limit = max(1, min(limit, 100))
    users = (
        await db.execute(
            select(User)
            .where(User.role == "member")
            .order_by(User.streak.desc(), User.id.asc())
        )
    ).scalars().all()
    ranks = await _rank_lookup(db, BOARD_STREAK, SUBJECT_USER)

    entries = []
    me_entry = None
    for index, user in enumerate(users, start=1):
        rank_row = ranks.get(user.id)
        entry = {
            "rank": index,
            "id": user.id,
            "name": user.name,
            "avatar": user.avatar,
            "points": user.streak,
            "movement": _movement(index, rank_row.previous_rank if rank_row else None),
            "is_current_user": bool(current_user and current_user.id == user.id),
            "meta": {"streak": user.streak, "streak_month": user.streak_month},
        }
        if index <= limit:
            entries.append(entry)
        if current_user and current_user.id == user.id:
            me_entry = entry

    return {
        "board": BOARD_STREAK,
        "title": "Streak leaderboard",
        "metric_label": "STREAK",
        "limit": limit,
        "total_participants": len(users),
        "entries": entries,
        "me": me_entry,
    }


async def get_competition_leaderboard(
    db: AsyncSession,
    *,
    current_user: User | None,
    limit: int = 20,
) -> dict:
    limit = max(1, min(limit, 100))
    teams = (
        await db.execute(
            select(Team).order_by(Team.competition_points.desc(), Team.id.asc())
        )
    ).scalars().all()
    ranks = await _rank_lookup(db, BOARD_COMPETITION, SUBJECT_TEAM)
    my_team_id = current_user.team_id if current_user else None

    member_counts: dict[int, int] = {}
    if teams:
        members = (
            await db.execute(
                select(User.team_id).where(User.team_id.is_not(None), User.role == "member")
            )
        ).scalars().all()
        for team_id in members:
            member_counts[team_id] = member_counts.get(team_id, 0) + 1

    entries = []
    me_entry = None
    for index, team in enumerate(teams, start=1):
        rank_row = ranks.get(team.id)
        is_mine = bool(my_team_id and my_team_id == team.id)
        entry = {
            "rank": index,
            "id": team.id,
            "name": team.name,
            "avatar": team.avatar,
            "points": team.competition_points,
            "movement": _movement(index, rank_row.previous_rank if rank_row else None),
            "is_current_user": is_mine,
            "meta": {"member_count": member_counts.get(team.id, 0)},
        }
        if index <= limit:
            entries.append(entry)
        if is_mine:
            me_entry = entry

    return {
        "board": BOARD_COMPETITION,
        "title": "Competition leaderboard",
        "metric_label": "TEAM POINTS",
        "limit": limit,
        "total_participants": len(teams),
        "entries": entries,
        "me": me_entry,
    }
