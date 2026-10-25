from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import TerritoryCell, User, UserPresence
from app.schemas.common import (
    PresenceUpdate,
    TerritoryCellRead,
    TerritoryClaimRequest,
    TerritoryPlayerRead,
    TerritoryPoint,
    TerritoryStateResponse,
)
from app.services.presence_service import haversine_m, initials_from_name, upsert_presence
from app.services.progress_service import record_activity_progress

CELL_DEG = 0.00016  # ~18 m
CELL_M = 18.0
BRUSH_RADIUS = 1  # 3x3 disk around each GPS sample
MAX_CELLS_PER_CLAIM = 48
MAX_MOVE_PER_CLAIM = 12
VIEW_PAD_CELLS = 4
LIVE_WINDOW = timedelta(minutes=20)

PLAYER_COLORS = (
    "#f97316",
    "#38bdf8",
    "#a3e635",
    "#c084fc",
    "#facc15",
    "#fb7185",
    "#2dd4bf",
    "#60a5fa",
)
YOU_COLOR = "#f472b6"


def to_cell(latitude: float, longitude: float) -> tuple[int, int]:
    return (
        math.floor(longitude / CELL_DEG),
        math.floor(latitude / CELL_DEG),
    )


def cell_center(cell_x: int, cell_y: int) -> tuple[float, float]:
    return ((cell_y + 0.5) * CELL_DEG, (cell_x + 0.5) * CELL_DEG)


def player_color(user_id: int, is_you: bool = False) -> str:
    if is_you:
        return YOU_COLOR
    return PLAYER_COLORS[user_id % len(PLAYER_COLORS)]


def brush_cells(points: list[TerritoryPoint]) -> set[tuple[int, int]]:
    claimed: set[tuple[int, int]] = set()
    for point in points:
        origin_x, origin_y = to_cell(point.latitude, point.longitude)
        for dx in range(-BRUSH_RADIUS, BRUSH_RADIUS + 1):
            for dy in range(-BRUSH_RADIUS, BRUSH_RADIUS + 1):
                if dx * dx + dy * dy <= BRUSH_RADIUS * BRUSH_RADIUS + 1:
                    claimed.add((origin_x + dx, origin_y + dy))
                if len(claimed) >= MAX_CELLS_PER_CLAIM:
                    return claimed
    return claimed


def _viewport_cells(latitude: float, longitude: float, radius_m: float) -> tuple[int, int, int, int]:
    lat_pad = (radius_m / 111_320) / CELL_DEG + VIEW_PAD_CELLS
    lng_pad = (radius_m / (111_320 * max(0.2, math.cos(math.radians(latitude))))) / CELL_DEG + VIEW_PAD_CELLS
    origin_x, origin_y = to_cell(latitude, longitude)
    return (
        math.floor(origin_x - lng_pad),
        math.ceil(origin_x + lng_pad),
        math.floor(origin_y - lat_pad),
        math.ceil(origin_y + lat_pad),
    )


def _player_read(
    user: User,
    latitude: float,
    longitude: float,
    cell_count: int,
    *,
    is_you: bool,
) -> TerritoryPlayerRead:
    return TerritoryPlayerRead(
        id=user.id,
        name=user.name,
        initials=initials_from_name(user.name),
        color=player_color(user.id, is_you),
        latitude=latitude,
        longitude=longitude,
        cell_count=cell_count,
        area_m2=int(round(cell_count * CELL_M * CELL_M)),
        is_you=is_you,
    )


async def _counts_for_owners(db: AsyncSession, owner_ids: set[int]) -> dict[int, int]:
    if not owner_ids:
        return {}
    rows = (
        await db.execute(select(TerritoryCell.owner_id).where(TerritoryCell.owner_id.in_(owner_ids)))
    ).all()
    counts: dict[int, int] = defaultdict(int)
    for (owner_id,) in rows:
        counts[owner_id] += 1
    return counts


async def claim_and_state(
    db: AsyncSession,
    user: User,
    payload: TerritoryClaimRequest,
    *,
    radius_m: float = 800,
) -> TerritoryStateResponse:
    await upsert_presence(
        db,
        user,
        PresenceUpdate(latitude=payload.latitude, longitude=payload.longitude, is_sharing=True),
    )

    captured = 0
    stolen = 0
    points_awarded = 0

    if payload.is_playing:
        samples = [TerritoryPoint(latitude=payload.latitude, longitude=payload.longitude), *payload.trail]
        wanted = brush_cells(samples)
        existing_rows = (
            (
                await db.execute(
                    select(TerritoryCell).where(
                        TerritoryCell.cell_x.in_({x for x, _ in wanted}),
                        TerritoryCell.cell_y.in_({y for _, y in wanted}),
                    )
                )
            ).scalars().all()
            if wanted
            else []
        )
        by_xy = {(row.cell_x, row.cell_y): row for row in existing_rows}
        now = datetime.utcnow()
        for cell_x, cell_y in wanted:
            row = by_xy.get((cell_x, cell_y))
            if row is None:
                db.add(TerritoryCell(cell_x=cell_x, cell_y=cell_y, owner_id=user.id, claimed_at=now))
                captured += 1
                continue
            if row.owner_id == user.id:
                continue
            row.owner_id = user.id
            row.claimed_at = now
            captured += 1
            stolen += 1
        if captured:
            points_awarded = min(MAX_MOVE_PER_CLAIM, captured)
            await record_activity_progress(db, user, move_awarded=points_awarded)
        await db.commit()

    return await get_territory_state(
        db,
        latitude=payload.latitude,
        longitude=payload.longitude,
        radius_m=radius_m,
        current_user=user,
        captured=captured,
        stolen=stolen,
        points_awarded=points_awarded,
    )


async def get_territory_state(
    db: AsyncSession,
    *,
    latitude: float,
    longitude: float,
    radius_m: float = 800,
    current_user: User | None = None,
    captured: int = 0,
    stolen: int = 0,
    points_awarded: int = 0,
) -> TerritoryStateResponse:
    min_x, max_x, min_y, max_y = _viewport_cells(latitude, longitude, radius_m)
    rows = (
        await db.execute(
            select(TerritoryCell).where(
                TerritoryCell.cell_x.between(min_x, max_x),
                TerritoryCell.cell_y.between(min_y, max_y),
            )
        )
    ).scalars().all()

    cells = [TerritoryCellRead(x=row.cell_x, y=row.cell_y, owner_id=row.owner_id) for row in rows]
    owner_ids = {row.owner_id for row in rows}
    if current_user:
        owner_ids.add(current_user.id)

    cutoff = datetime.utcnow() - LIVE_WINDOW
    presence_rows = (
        await db.execute(
            select(UserPresence, User)
            .join(User, User.id == UserPresence.user_id)
            .where(
                UserPresence.is_sharing.is_(True),
                UserPresence.updated_at >= cutoff,
                User.role == "member",
            )
        )
    ).all()

    nearby_ids: set[int] = set()
    positions: dict[int, tuple[float, float]] = {}
    users_by_id: dict[int, User] = {}
    for presence, person in presence_rows:
        if current_user and person.id == current_user.id:
            continue
        distance = haversine_m(latitude, longitude, presence.latitude, presence.longitude)
        if distance > radius_m:
            continue
        nearby_ids.add(person.id)
        positions[person.id] = (presence.latitude, presence.longitude)
        users_by_id[person.id] = person
        owner_ids.add(person.id)

    if owner_ids - users_by_id.keys() - ({current_user.id} if current_user else set()):
        missing = owner_ids - users_by_id.keys()
        if current_user:
            missing.discard(current_user.id)
        if missing:
            loaded = (await db.execute(select(User).where(User.id.in_(missing)))).scalars().all()
            for person in loaded:
                users_by_id[person.id] = person

    counts = await _counts_for_owners(db, owner_ids)

    players: list[TerritoryPlayerRead] = []
    me: TerritoryPlayerRead | None = None
    if current_user:
        me = _player_read(
            current_user,
            latitude,
            longitude,
            counts.get(current_user.id, 0),
            is_you=True,
        )
        players.append(me)

    for user_id in nearby_ids:
        person = users_by_id.get(user_id)
        if not person:
            continue
        plat, plng = positions[user_id]
        players.append(_player_read(person, plat, plng, counts.get(user_id, 0), is_you=False))

    players.sort(key=lambda item: (-item.cell_count, item.name.lower()))

    return TerritoryStateResponse(
        cell_deg=CELL_DEG,
        cell_m=CELL_M,
        latitude=latitude,
        longitude=longitude,
        radius_m=radius_m,
        players=players,
        cells=cells,
        me=me,
        captured=captured,
        stolen=stolen,
        points_awarded=points_awarded,
        total_points=current_user.total_points if current_user else 0,
    )
