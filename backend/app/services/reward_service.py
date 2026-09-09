"""MOVE reward store — list, detail, redeem, and history."""

from datetime import datetime, timezone


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Reward, RewardRedemption, User

STATUS_COMPLETED = "COMPLETED"


def _serialize_reward(reward: Reward) -> dict:
    return {
        "id": reward.id,
        "title": reward.title,
        "description": reward.description,
        "category": reward.category,
        "points_required": reward.points_required,
        "stock": reward.stock,
        "image": reward.image,
        "active": reward.active,
    }


async def list_rewards(db: AsyncSession, *, active_only: bool = True) -> list[dict]:
    query = select(Reward).order_by(Reward.points_required.asc(), Reward.id.asc())
    if active_only:
        query = query.where(Reward.active.is_(True))
    rewards = (await db.execute(query)).scalars().all()
    return [_serialize_reward(reward) for reward in rewards]


async def get_reward(db: AsyncSession, reward_id: int, *, require_active: bool = False) -> dict:
    reward = await db.get(Reward, reward_id)
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    if require_active and not reward.active:
        raise HTTPException(status_code=404, detail="Reward not found")
    return _serialize_reward(reward)


async def redeem_reward(db: AsyncSession, user: User, reward_id: int) -> dict:
    """Atomically redeem a reward using server-side MOVE cost and stock."""
    # Re-load user and reward in this transaction; cost always comes from Reward.
    locked_user = await db.get(User, user.id)
    if not locked_user:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    reward = await db.get(Reward, reward_id)
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    if not reward.active:
        raise HTTPException(status_code=400, detail="Reward is not active")
    if reward.stock <= 0:
        raise HTTPException(status_code=400, detail="Reward is out of stock")

    cost = int(reward.points_required)
    if cost <= 0:
        raise HTTPException(status_code=400, detail="Reward cost is invalid")
    if locked_user.total_points < cost:
        raise HTTPException(status_code=400, detail="Not enough MOVE")

    # Deduct MOVE and stock together; never allow a negative balance.
    new_balance = locked_user.total_points - cost
    if new_balance < 0:
        raise HTTPException(status_code=400, detail="Not enough MOVE")

    locked_user.total_points = new_balance
    reward.stock -= 1
    redeemed_at = _utcnow()
    redemption = RewardRedemption(
        user_id=locked_user.id,
        reward_id=reward.id,
        points_spent=cost,
        redeemed_at=redeemed_at,
        status=STATUS_COMPLETED,
    )
    db.add(redemption)
    await db.commit()
    await db.refresh(redemption)
    await db.refresh(locked_user)
    await db.refresh(reward)

    return {
        "status": "redeemed",
        "redemption_id": redemption.id,
        "reward_id": reward.id,
        "reward_title": reward.title,
        "points_spent": cost,
        "total_points": locked_user.total_points,
        "stock_remaining": reward.stock,
        "redeemed_at": redemption.redeemed_at,
    }


async def list_redemption_history(db: AsyncSession, user: User) -> list[dict]:
    rows = (
        await db.execute(
            select(RewardRedemption, Reward)
            .join(Reward, Reward.id == RewardRedemption.reward_id)
            .where(RewardRedemption.user_id == user.id)
            .order_by(RewardRedemption.redeemed_at.desc(), RewardRedemption.id.desc())
        )
    ).all()
    history: list[dict] = []
    for redemption, reward in rows:
        history.append(
            {
                "id": redemption.id,
                "user_id": redemption.user_id,
                "reward_id": redemption.reward_id,
                "points_spent": redemption.points_spent,
                "redeemed_at": redemption.redeemed_at,
                "status": redemption.status,
                "reward": _serialize_reward(reward),
            }
        )
    return history
