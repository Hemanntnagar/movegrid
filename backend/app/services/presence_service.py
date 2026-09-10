from __future__ import annotations

import math
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import User, UserPresence
from app.schemas.common import NearbyPresenceResponse, NearbyUserRead, PresenceUpdate, PresenceRead

LIVE_WINDOW = timedelta(minutes=15)
EARTH_RADIUS_M = 6_371_000


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    rlat1, rlon1, rlat2, rlon2 = map(math.radians, (lat1, lon1, lat2, lon2))
    dlat = rlat2 - rlat1
    dlon = rlon2 - rlon1
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def offset_lat_lng(lat: float, lng: float, north_m: float, east_m: float) -> tuple[float, float]:
    dlat = north_m / 111_320
    dlng = east_m / (111_320 * max(0.2, math.cos(math.radians(lat))))
    return lat + dlat, lng + dlng


def format_distance(meters: float) -> str:
    if meters < 1000:
        return f"{int(round(meters))} m"
    return f"{meters / 1000:.1f} km"


def initials_from_name(name: str) -> str:
    parts = [p for p in name.split() if p]
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return f"{parts[0][0]}{parts[-1][0]}".upper()


async def upsert_presence(db: AsyncSession, user: User, payload: PresenceUpdate) -> PresenceRead:
    row = (
        await db.execute(select(UserPresence).where(UserPresence.user_id == user.id))
    ).scalar_one_or_none()
    now = datetime.utcnow()
    if row:
        row.latitude = payload.latitude
        row.longitude = payload.longitude
        row.is_sharing = payload.is_sharing
        row.updated_at = now
    else:
        row = UserPresence(
            user_id=user.id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            is_sharing=payload.is_sharing,
            updated_at=now,
        )
        db.add(row)
    await db.commit()
    await db.refresh(row)
    return PresenceRead(
        user_id=row.user_id,
        latitude=row.latitude,
        longitude=row.longitude,
        is_sharing=row.is_sharing,
        updated_at=row.updated_at,
    )


async def list_nearby(
    db: AsyncSession,
    *,
    latitude: float,
    longitude: float,
    radius_m: float = 800,
    current_user: User | None = None,
) -> NearbyPresenceResponse:
    cutoff = datetime.utcnow() - LIVE_WINDOW
    rows = (
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

    nearby: list[NearbyUserRead] = []
    for presence, user in rows:
        if current_user and user.id == current_user.id:
            continue
        distance = haversine_m(latitude, longitude, presence.latitude, presence.longitude)
        if distance > radius_m:
            continue
        nearby.append(
            NearbyUserRead(
                id=user.id,
                name=user.name,
                avatar=user.avatar,
                initials=initials_from_name(user.name),
                latitude=presence.latitude,
                longitude=presence.longitude,
                distance_m=round(distance, 1),
                distance_label=format_distance(distance),
                total_points=user.total_points,
                streak=user.streak,
                updated_at=presence.updated_at,
                is_current_user=False,
            )
        )

    nearby.sort(key=lambda item: item.distance_m)

    me: NearbyUserRead | None = None
    if current_user:
        me = NearbyUserRead(
            id=current_user.id,
            name=current_user.name,
            avatar=current_user.avatar,
            initials=initials_from_name(current_user.name),
            latitude=latitude,
            longitude=longitude,
            distance_m=0,
            distance_label="You",
            total_points=current_user.total_points,
            streak=current_user.streak,
            updated_at=datetime.utcnow(),
            is_current_user=True,
        )

    return NearbyPresenceResponse(
        latitude=latitude,
        longitude=longitude,
        radius_m=radius_m,
        count=len(nearby),
        me=me,
        nearby=nearby,
    )
