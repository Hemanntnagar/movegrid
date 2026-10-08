"""Backend-owned leaderboard ranking queries and rank delta tracking."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import and_, func, not_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.demo_accounts import LEGACY_DEMO_EMAIL_SUFFIX, LEGACY_DEMO_TEAM_NAMES
from app.core.paging import clamp_limit, clamp_offset, paging_meta
from app.models.entities import LeaderboardRank, Team, User

_LEGACY_DEMO_TEAM_NAMES = frozenset(LEGACY_DEMO_TEAM_NAMES)


def _ranked_member_filters():
    return (User.role == "member", not_(User.email.ilike(f"%{LEGACY_DEMO_EMAIL_SUFFIX}")))


async def _team_ids_with_real_members(db: AsyncSession) -> set[int]:
    rows = (
        await db.execute(
            select(User.team_id).where(
                User.team_id.is_not(None),
                *_ranked_member_filters(),
            )
        )
    ).scalars().all()
    return {team_id for team_id in rows if team_id is not None}


def _include_team_on_competition_board(team: Team, real_member_team_ids: set[int]) -> bool:
    if team.id in real_member_team_ids:
        return True
    return team.name not in _LEGACY_DEMO_TEAM_NAMES


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


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
    now = _utcnow()
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
            .where(*_ranked_member_filters())
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
            .where(*_ranked_member_filters())
            .order_by(User.streak.desc(), User.id.asc())
        )
    ).all()
    await refresh_board_ranks(
        db,
        board=BOARD_STREAK,
        subject_type=SUBJECT_USER,
        ordered_ids_and_points=[(row.id, row.streak) for row in streak_users],
    )

    real_member_team_ids = await _team_ids_with_real_members(db)
    all_teams = (
        await db.execute(
            select(Team).order_by(Team.competition_points.desc(), Team.id.asc())
        )
    ).scalars().all()
    teams = [team for team in all_teams if _include_team_on_competition_board(team, real_member_team_ids)]
    await refresh_board_ranks(
        db,
        board=BOARD_COMPETITION,
        subject_type=SUBJECT_TEAM,
        ordered_ids_and_points=[(team.id, team.competition_points) for team in teams],
    )


def _movement(rank: int, previous_rank: int | None) -> int:
    if previous_rank is None:
        return 0
    return previous_rank - rank


async def _rank_lookup(
    db: AsyncSession,
    board: str,
    subject_type: str,
    *,
    subject_ids: list[int] | None = None,
) -> dict[int, LeaderboardRank]:
    query = select(LeaderboardRank).where(
        LeaderboardRank.board == board,
        LeaderboardRank.subject_type == subject_type,
    )
    if subject_ids is not None:
        if not subject_ids:
            return {}
        query = query.where(LeaderboardRank.subject_id.in_(subject_ids))
    rows = (await db.execute(query)).scalars().all()
    return {row.subject_id: row for row in rows}


def _user_entry(
    user: User,
    *,
    rank: int,
    points: int,
    rank_row: LeaderboardRank | None,
    current_user: User | None,
    meta: dict,
) -> dict:
    return {
        "rank": rank,
        "id": user.id,
        "name": user.name,
        "avatar": user.avatar,
        "points": points,
        "movement": _movement(rank, rank_row.previous_rank if rank_row else None),
        "is_current_user": bool(current_user and current_user.id == user.id),
        "meta": meta,
    }


async def _user_rank_by_points(db: AsyncSession, user: User, *, score_attr: str) -> int:
    """1-based rank for a user without loading the full board."""
    score = getattr(user, score_attr)
    column = getattr(User, score_attr)
    ahead = (
        await db.execute(
            select(func.count())
            .select_from(User)
            .where(
                *_ranked_member_filters(),
                or_(
                    column > score,
                    and_(column == score, User.id < user.id),
                ),
            )
        )
    ).scalar_one()
    return int(ahead) + 1


async def get_move_leaderboard(
    db: AsyncSession,
    *,
    current_user: User | None,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    limit = clamp_limit(limit)
    offset = clamp_offset(offset)
    filters = _ranked_member_filters()

    total = (
        await db.execute(select(func.count()).select_from(User).where(*filters))
    ).scalar_one()

    users = (
        await db.execute(
            select(User)
            .where(*filters)
            .order_by(User.total_points.desc(), User.id.asc())
            .offset(offset)
            .limit(limit)
        )
    ).scalars().all()

    lookup_ids = [user.id for user in users]
    if current_user and current_user.id not in lookup_ids:
        lookup_ids.append(current_user.id)
    ranks = await _rank_lookup(db, BOARD_MOVE, SUBJECT_USER, subject_ids=lookup_ids)

    entries = []
    me_entry = None
    for index, user in enumerate(users, start=offset + 1):
        entry = _user_entry(
            user,
            rank=index,
            points=user.total_points,
            rank_row=ranks.get(user.id),
            current_user=current_user,
            meta={"streak": user.streak},
        )
        entries.append(entry)
        if entry["is_current_user"]:
            me_entry = entry

    if current_user and me_entry is None and current_user.role == "member":
        # Only surface "me" for ranked members (same filter as the board).
        if not current_user.email.lower().endswith(LEGACY_DEMO_EMAIL_SUFFIX):
            rank = await _user_rank_by_points(db, current_user, score_attr="total_points")
            me_entry = _user_entry(
                current_user,
                rank=rank,
                points=current_user.total_points,
                rank_row=ranks.get(current_user.id),
                current_user=current_user,
                meta={"streak": current_user.streak},
            )

    meta = paging_meta(total=total, limit=limit, offset=offset)
    return {
        "board": BOARD_MOVE,
        "title": "MOVE leaderboard",
        "metric_label": "MOVE",
        "limit": limit,
        "offset": meta["offset"],
        "page": meta["page"],
        "page_size": meta["page_size"],
        "total": meta["total"],
        "has_more": meta["has_more"],
        "total_participants": total,
        "entries": entries,
        "me": me_entry,
    }


async def get_streak_leaderboard(
    db: AsyncSession,
    *,
    current_user: User | None,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    limit = clamp_limit(limit)
    offset = clamp_offset(offset)
    filters = _ranked_member_filters()

    total = (
        await db.execute(select(func.count()).select_from(User).where(*filters))
    ).scalar_one()

    users = (
        await db.execute(
            select(User)
            .where(*filters)
            .order_by(User.streak.desc(), User.id.asc())
            .offset(offset)
            .limit(limit)
        )
    ).scalars().all()

    lookup_ids = [user.id for user in users]
    if current_user and current_user.id not in lookup_ids:
        lookup_ids.append(current_user.id)
    ranks = await _rank_lookup(db, BOARD_STREAK, SUBJECT_USER, subject_ids=lookup_ids)

    entries = []
    me_entry = None
    for index, user in enumerate(users, start=offset + 1):
        entry = _user_entry(
            user,
            rank=index,
            points=user.streak,
            rank_row=ranks.get(user.id),
            current_user=current_user,
            meta={"streak": user.streak, "streak_month": user.streak_month},
        )
        entries.append(entry)
        if entry["is_current_user"]:
            me_entry = entry

    if current_user and me_entry is None and current_user.role == "member":
        if not current_user.email.lower().endswith(LEGACY_DEMO_EMAIL_SUFFIX):
            rank = await _user_rank_by_points(db, current_user, score_attr="streak")
            me_entry = _user_entry(
                current_user,
                rank=rank,
                points=current_user.streak,
                rank_row=ranks.get(current_user.id),
                current_user=current_user,
                meta={"streak": current_user.streak, "streak_month": current_user.streak_month},
            )

    meta = paging_meta(total=total, limit=limit, offset=offset)
    return {
        "board": BOARD_STREAK,
        "title": "Streak leaderboard",
        "metric_label": "STREAK",
        "limit": limit,
        "offset": meta["offset"],
        "page": meta["page"],
        "page_size": meta["page_size"],
        "total": meta["total"],
        "has_more": meta["has_more"],
        "total_participants": total,
        "entries": entries,
        "me": me_entry,
    }


async def get_competition_leaderboard(
    db: AsyncSession,
    *,
    current_user: User | None,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    limit = clamp_limit(limit)
    offset = clamp_offset(offset)
    real_member_team_ids = await _team_ids_with_real_members(db)
    # Team boards stay small; filter demo teams then page in memory.
    all_teams = (
        await db.execute(
            select(Team).order_by(Team.competition_points.desc(), Team.id.asc())
        )
    ).scalars().all()
    teams = [team for team in all_teams if _include_team_on_competition_board(team, real_member_team_ids)]
    total = len(teams)
    page_teams = teams[offset : offset + limit]

    ranks = await _rank_lookup(
        db,
        BOARD_COMPETITION,
        SUBJECT_TEAM,
        subject_ids=[team.id for team in page_teams]
        + ([current_user.team_id] if current_user and current_user.team_id else []),
    )
    my_team_id = current_user.team_id if current_user else None

    member_counts: dict[int, int] = {}
    if page_teams or my_team_id:
        members = (
            await db.execute(
                select(User.team_id).where(User.team_id.is_not(None), *_ranked_member_filters())
            )
        ).scalars().all()
        for team_id in members:
            member_counts[team_id] = member_counts.get(team_id, 0) + 1

    entries = []
    me_entry = None
    for index, team in enumerate(page_teams, start=offset + 1):
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
        entries.append(entry)
        if is_mine:
            me_entry = entry

    if my_team_id and me_entry is None:
        for index, team in enumerate(teams, start=1):
            if team.id == my_team_id:
                rank_row = ranks.get(team.id)
                me_entry = {
                    "rank": index,
                    "id": team.id,
                    "name": team.name,
                    "avatar": team.avatar,
                    "points": team.competition_points,
                    "movement": _movement(index, rank_row.previous_rank if rank_row else None),
                    "is_current_user": True,
                    "meta": {"member_count": member_counts.get(team.id, 0)},
                }
                break

    meta = paging_meta(total=total, limit=limit, offset=offset)
    return {
        "board": BOARD_COMPETITION,
        "title": "Competition leaderboard",
        "metric_label": "TEAM POINTS",
        "limit": limit,
        "offset": meta["offset"],
        "page": meta["page"],
        "page_size": meta["page_size"],
        "total": meta["total"],
        "has_more": meta["has_more"],
        "total_participants": total,
        "entries": entries,
        "me": me_entry,
    }
