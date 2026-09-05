from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class ClassGroup(Base):
    __tablename__ = "classes"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    department: Mapped[str] = mapped_column(String(120), default="General")

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), default="MOVEGRID Student")
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="student")
    class_id: Mapped[int | None] = mapped_column(ForeignKey("classes.id"), nullable=True)
    total_points: Mapped[int] = mapped_column(Integer, default=0)
    streak: Mapped[int] = mapped_column(Integer, default=0)
    active_minutes: Mapped[int] = mapped_column(Integer, default=0)
    avatar: Mapped[str] = mapped_column(String(255), default="/avatars/student.png")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    @property
    def full_name(self) -> str:
        return self.name

    @property
    def move_points(self) -> int:
        return self.total_points

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

class Zone(Base):
    __tablename__ = "zones"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    latitude: Mapped[float] = mapped_column(default=0)
    longitude: Mapped[float] = mapped_column(default=0)
    qr_token: Mapped[str] = mapped_column(String(255), default="movegrid-demo")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    @property
    def qr_secret(self) -> str:
        return self.qr_token

class Challenge(Base):
    __tablename__ = "challenges"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(40), default="Walk")
    difficulty: Mapped[str] = mapped_column(String(30), default="Medium")
    duration_minutes: Mapped[int] = mapped_column(Integer, default=15)
    reward_points: Mapped[int] = mapped_column(Integer, default=100)
    zone_id: Mapped[int] = mapped_column(ForeignKey("zones.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    @property
    def move_reward(self) -> int:
        return self.reward_points

    @property
    def minutes(self) -> int:
        return self.duration_minutes

    @property
    def kind(self) -> str:
        return self.type

    @property
    def active(self) -> bool:
        return self.is_active

class Activity(Base):
    __tablename__ = "activities"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    challenge_id: Mapped[int] = mapped_column(ForeignKey("challenges.id"))
    status: Mapped[str] = mapped_column(String(30), default="started")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    points_earned: Mapped[int] = mapped_column(Integer, default=0)
    verification_status: Mapped[str] = mapped_column(String(30), default="pending")

    @property
    def move_awarded(self) -> int:
        return self.points_earned

class Squad(Base):
    __tablename__ = "squads"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    activity: Mapped[str] = mapped_column(String(120), default="Campus walk")
    location: Mapped[str] = mapped_column(String(120), default="Campus")
    scheduled_time: Mapped[str] = mapped_column(String(80), default="Today")
    max_members: Mapped[int] = mapped_column(Integer, default=8)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

class SquadMember(Base):
    __tablename__ = "squad_members"
    id: Mapped[int] = mapped_column(primary_key=True)
    squad_id: Mapped[int] = mapped_column(ForeignKey("squads.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

class Reward(Base):
    __tablename__ = "rewards"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    points_required: Mapped[int] = mapped_column(Integer)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    image: Mapped[str] = mapped_column(String(255), default="/rewards/default.png")

    @property
    def cost(self) -> int:
        return self.points_required

    @property
    def inventory(self) -> int:
        return self.stock

class RewardRedemption(Base):
    __tablename__ = "reward_redemptions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    reward_id: Mapped[int] = mapped_column(ForeignKey("rewards.id"))
    points_spent: Mapped[int] = mapped_column(Integer)
    redeemed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Achievement(Base):
    __tablename__ = "achievements"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    icon: Mapped[str] = mapped_column(String(40), default="star")
    required_points: Mapped[int] = mapped_column(Integer, default=100)

class UserAchievement(Base):
    __tablename__ = "user_achievements"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    achievement_id: Mapped[int] = mapped_column(ForeignKey("achievements.id"))
    unlocked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
