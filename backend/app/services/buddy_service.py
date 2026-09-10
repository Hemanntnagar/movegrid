from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import BuddyConnection, BuddyInvite, User


def _pair_ids(a: int, b: int) -> tuple[int, int]:
    return (a, b) if a < b else (b, a)


def _user_card(user: User) -> dict:
    initials = "".join(part[0] for part in user.name.split()[:2]).upper() or "MG"
    return {
        "id": user.id,
        "name": user.name,
        "avatar": user.avatar,
        "initials": initials[:2],
        "total_points": user.total_points,
        "streak": user.streak,
        "fitness_level": user.fitness_level,
    }


async def _connection_exists(db: AsyncSession, user_id: int, other_id: int) -> bool:
    a, b = _pair_ids(user_id, other_id)
    row = (
        await db.execute(
            select(BuddyConnection.id).where(
                BuddyConnection.user_a_id == a,
                BuddyConnection.user_b_id == b,
            )
        )
    ).scalar_one_or_none()
    return row is not None


async def send_invite(db: AsyncSession, sender: User, to_user_id: int, message: str) -> dict:
    if to_user_id == sender.id:
        raise HTTPException(400, "You cannot invite yourself")
    target = await db.get(User, to_user_id)
    if not target:
        raise HTTPException(404, "User not found")
    if await _connection_exists(db, sender.id, to_user_id):
        raise HTTPException(400, "You are already connected with this mover")

    existing = (
        await db.execute(
            select(BuddyInvite).where(
                BuddyInvite.from_user_id == sender.id,
                BuddyInvite.to_user_id == to_user_id,
            )
        )
    ).scalar_one_or_none()
    if existing:
        if existing.status == "pending":
            existing.message = message
            await db.commit()
            await db.refresh(existing)
            return _invite_payload(existing, sender, target)
        if existing.status == "accepted":
            raise HTTPException(400, "You are already connected with this mover")
        existing.status = "pending"
        existing.message = message
        existing.responded_at = None
        existing.created_at = datetime.utcnow()
        await db.commit()
        await db.refresh(existing)
        return _invite_payload(existing, sender, target)

    reverse = (
        await db.execute(
            select(BuddyInvite).where(
                BuddyInvite.from_user_id == to_user_id,
                BuddyInvite.to_user_id == sender.id,
                BuddyInvite.status == "pending",
            )
        )
    ).scalar_one_or_none()
    if reverse:
        result = await accept_invite(db, sender, reverse.id)
        return result["invite"]

    invite = BuddyInvite(
        from_user_id=sender.id,
        to_user_id=to_user_id,
        message=message,
        status="pending",
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    return _invite_payload(invite, sender, target)


def _invite_payload(invite: BuddyInvite, from_user: User, to_user: User) -> dict:
    return {
        "id": invite.id,
        "from_user_id": invite.from_user_id,
        "to_user_id": invite.to_user_id,
        "message": invite.message,
        "status": invite.status,
        "created_at": invite.created_at,
        "from_user": _user_card(from_user),
        "to_user": _user_card(to_user),
    }


async def list_incoming_invites(db: AsyncSession, user: User) -> list[dict]:
    rows = (
        await db.execute(
            select(BuddyInvite, User)
            .join(User, User.id == BuddyInvite.from_user_id)
            .where(BuddyInvite.to_user_id == user.id, BuddyInvite.status == "pending")
            .order_by(BuddyInvite.created_at.desc())
        )
    ).all()
    result = []
    for invite, from_user in rows:
        result.append(_invite_payload(invite, from_user, user))
    return result


async def accept_invite(db: AsyncSession, user: User, invite_id: int) -> dict:
    invite = await db.get(BuddyInvite, invite_id)
    if not invite or invite.to_user_id != user.id:
        raise HTTPException(404, "Invite not found")
    if invite.status != "pending":
        raise HTTPException(400, "This invite is no longer pending")

    from_user = await db.get(User, invite.from_user_id)
    if not from_user:
        raise HTTPException(404, "User not found")

    a, b = _pair_ids(invite.from_user_id, invite.to_user_id)
    if not await _connection_exists(db, invite.from_user_id, invite.to_user_id):
        db.add(BuddyConnection(user_a_id=a, user_b_id=b))

    invite.status = "accepted"
    invite.responded_at = datetime.utcnow()
    await db.commit()
    await db.refresh(invite)

    return {
        "status": "connected",
        "invite": _invite_payload(invite, from_user, user),
        "buddy": _user_card(from_user),
    }


async def decline_invite(db: AsyncSession, user: User, invite_id: int) -> dict:
    invite = await db.get(BuddyInvite, invite_id)
    if not invite or invite.to_user_id != user.id:
        raise HTTPException(404, "Invite not found")
    if invite.status != "pending":
        raise HTTPException(400, "This invite is no longer pending")
    invite.status = "declined"
    invite.responded_at = datetime.utcnow()
    await db.commit()
    return {"status": "declined", "invite_id": invite_id}


async def list_buddies(db: AsyncSession, user: User) -> list[dict]:
    connections = (
        await db.execute(
            select(BuddyConnection).where(
                or_(BuddyConnection.user_a_id == user.id, BuddyConnection.user_b_id == user.id)
            )
        )
    ).scalars().all()
    buddy_ids = [
        conn.user_b_id if conn.user_a_id == user.id else conn.user_a_id for conn in connections
    ]
    if not buddy_ids:
        return []
    users = (await db.execute(select(User).where(User.id.in_(buddy_ids)))).scalars().all()
    by_id = {u.id: u for u in users}
    buddies: list[dict] = []
    for conn in connections:
        other_id = conn.user_b_id if conn.user_a_id == user.id else conn.user_a_id
        buddy = by_id.get(other_id)
        if not buddy:
            continue
        card = _user_card(buddy)
        card["connected_at"] = conn.connected_at
        buddies.append(card)
    buddies.sort(key=lambda item: item["name"].lower())
    return buddies
