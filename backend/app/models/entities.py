from datetime import date, datetime
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class ClassGroup(Base):
    __tablename__ = "classes"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    department: Mapped[str] = mapped_column(String(120), default="General")

class Competition(Base):
    __tablename__ = "competitions"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    company_name: Mapped[str] = mapped_column(String(160), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    reward: Mapped[str] = mapped_column(String(255), default="")
    eligibility: Mapped[str] = mapped_column(String(255), default="Open to all members")
    min_points: Mapped[int] = mapped_column(Integer, default=0)
    min_streak: Mapped[int] = mapped_column(Integer, default=0)
    starts_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class CompetitionParticipant(Base):
    __tablename__ = "competition_participants"
    __table_args__ = (UniqueConstraint("competition_id", "user_id", name="uq_competition_participant"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Team(Base):
    __tablename__ = "teams"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    avatar: Mapped[str] = mapped_column(String(255), default="/avatars/team.png")
    competition_id: Mapped[int | None] = mapped_column(ForeignKey("competitions.id"), nullable=True)
    competition_points: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), default="MOVEGRID Mover")
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="member")
    class_id: Mapped[int | None] = mapped_column(ForeignKey("classes.id"), nullable=True)
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"), nullable=True, index=True)
    fitness_level: Mapped[str] = mapped_column(String(30), default="Beginner")
    total_points: Mapped[int] = mapped_column(Integer, default=0)
    streak: Mapped[int] = mapped_column(Integer, default=0)
    streak_score: Mapped[int] = mapped_column(Integer, default=0)
    streak_month: Mapped[str] = mapped_column(String(7), default="")
    last_activity_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    active_minutes: Mapped[int] = mapped_column(Integer, default=0)
    steps: Mapped[int] = mapped_column(Integer, default=0)
    avatar: Mapped[str] = mapped_column(String(255), default="/avatars/mover.png")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    @property
    def full_name(self) -> str:
        return self.name

    @property
    def move_points(self) -> int:
        return self.total_points

class LeaderboardRank(Base):
    __tablename__ = "leaderboard_ranks"
    __table_args__ = (UniqueConstraint("board", "subject_type", "subject_id", name="uq_leaderboard_subject"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    board: Mapped[str] = mapped_column(String(30), index=True)
    subject_type: Mapped[str] = mapped_column(String(20), index=True)
    subject_id: Mapped[int] = mapped_column(Integer, index=True)
    rank: Mapped[int] = mapped_column(Integer, default=0)
    previous_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    points: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

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
    steps_count: Mapped[int] = mapped_column(Integer, default=0)
    verification_status: Mapped[str] = mapped_column(String(30), default="pending")

    @property
    def move_awarded(self) -> int:
        return self.points_earned

class Squad(Base):
    __tablename__ = "squads"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    activity: Mapped[str] = mapped_column(String(120), default="Neighborhood walk")
    location: Mapped[str] = mapped_column(String(120), default="City")
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
    category: Mapped[str] = mapped_column(String(60), default="General")
    points_required: Mapped[int] = mapped_column(Integer)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    image: Mapped[str] = mapped_column(String(255), default="/rewards/default.png")
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    @property
    def cost(self) -> int:
        return self.points_required

    @property
    def inventory(self) -> int:
        return self.stock

    @property
    def is_active(self) -> bool:
        return self.active

class RewardRedemption(Base):
    __tablename__ = "reward_redemptions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    reward_id: Mapped[int] = mapped_column(ForeignKey("rewards.id"))
    points_spent: Mapped[int] = mapped_column(Integer)
    redeemed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String(30), default="COMPLETED")

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

class Exercise(Base):
    __tablename__ = "exercises"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(40))
    difficulty: Mapped[str] = mapped_column(String(30), default="Beginner")
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0)
    target_reps: Mapped[int] = mapped_column(Integer, default=0)
    instructions: Mapped[str] = mapped_column(Text, default="")
    points: Mapped[int] = mapped_column(Integer, default=15)
    requires_equipment: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class DailyAssignment(Base):
    __tablename__ = "daily_assignments"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"))
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    status: Mapped[str] = mapped_column(String(20), default="ASSIGNED", index=True)
    points: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class UserPresence(Base):
    __tablename__ = "user_presence"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    latitude: Mapped[float] = mapped_column(default=0)
    longitude: Mapped[float] = mapped_column(default=0)
    is_sharing: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
