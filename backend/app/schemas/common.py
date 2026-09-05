from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str | None = None
    name: str | None = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr
    role: str
    class_id: int | None = None
    team_id: int | None = None
    fitness_level: str = "Beginner"
    total_points: int
    streak: int
    streak_score: int = 0
    streak_month: str = ""
    active_minutes: int
    avatar: str


class LeaderboardEntry(BaseModel):
    rank: int
    id: int
    name: str
    avatar: str
    points: int
    movement: int = 0
    is_current_user: bool = False
    meta: dict = Field(default_factory=dict)


class LeaderboardResponse(BaseModel):
    board: str
    title: str
    metric_label: str
    limit: int
    total_participants: int
    entries: list[LeaderboardEntry]
    me: LeaderboardEntry | None = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class MissionRead(BaseModel):
    id: int
    title: str
    description: str
    zone: str
    move_reward: int
    minutes: int
    kind: str

class ChallengeCreate(BaseModel):
    title: str
    description: str
    type: str = "Walk"
    difficulty: str = "Medium"
    duration_minutes: int = Field(default=15, gt=0)
    reward_points: int = Field(default=100, ge=0)
    zone_id: int
    is_active: bool = True

class ZoneCreate(BaseModel):
    name: str
    description: str = ""
    latitude: float = 0
    longitude: float = 0
    qr_token: str = "movegrid-demo"
    is_active: bool = True

class RewardCreate(BaseModel):
    title: str
    description: str = ""
    category: str = "General"
    points_required: int = Field(gt=0)
    stock: int = Field(default=0, ge=0)
    image: str = "/rewards/default.png"
    active: bool = True

class VerifyRequest(BaseModel):
    code: str = Field(min_length=1)

class SquadCreate(BaseModel):
    name: str
    activity: str = "Campus walk"
    location: str = "Campus"
    scheduled_time: str = "Today"
    max_members: int = Field(default=8, gt=0)

class RewardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str
    category: str
    points_required: int
    stock: int
    image: str
    active: bool = True

class RewardRedemptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    reward_id: int
    points_spent: int
    redeemed_at: datetime
    status: str
    reward: RewardRead | None = None

class RedeemResponse(BaseModel):
    status: str
    redemption_id: int
    reward_id: int
    reward_title: str
    points_spent: int
    total_points: int
    stock_remaining: int
    redeemed_at: datetime

class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    challenge_id: int
    status: str
    started_at: datetime
    completed_at: datetime | None
    points_earned: int
    verification_status: str

class ExerciseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str
    category: str
    difficulty: str
    duration_minutes: int
    target_reps: int
    instructions: str
    points: int

class DailyAssignmentRead(BaseModel):
    id: int
    user_id: int
    exercise_id: int
    assigned_at: datetime
    expires_at: datetime
    status: str
    points: int
    completed_at: datetime | None = None
    seconds_remaining: int = 0
    exercise: ExerciseRead

class FitnessProgress(BaseModel):
    completed: int
    total: int
    percent: int
    points_available: int
    points_earned: int

class TodayFitnessResponse(BaseModel):
    fitness_level: str
    total_points: int
    progress: FitnessProgress
    expires_at: datetime | None = None
    seconds_remaining: int = 0
    expired_just_now: int = 0
    assignments: list[DailyAssignmentRead]
    assigned: list[DailyAssignmentRead]
    completed: list[DailyAssignmentRead]

class CompleteAssignmentResponse(BaseModel):
    status: str
    assignment_id: int
    points_awarded: int
    total_points: int
    streak: int = 0
    streak_score: int = 0
    streak_gained: int = 0
    exercise_name: str | None = None
    completed_at: datetime | None = None

class FitnessHistoryResponse(BaseModel):
    total_points: int
    items: list[DailyAssignmentRead]
    completed: list[DailyAssignmentRead]
    expired: list[DailyAssignmentRead]
    assigned: list[DailyAssignmentRead]
