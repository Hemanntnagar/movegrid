from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str | None = None
    name: str | None = None
    fitness_level: str | None = "Beginner"

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
    steps: int = 0
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


class CompetitionCreate(BaseModel):
    company_name: str | None = ""
    venue: str = ""
    name: str
    description: str = ""
    reward: str = ""
    eligibility: str = "Open to all members"
    starts_at: datetime | None = None
    ends_at: datetime
    min_points: int = 0
    min_streak: int = 0


class CompetitionRead(BaseModel):
    id: int
    name: str
    company_name: str | None = ""
    venue: str = ""
    description: str
    reward: str | None = ""
    eligibility: str
    min_points: int = 0
    min_streak: int = 0
    starts_at: datetime
    ends_at: datetime | None = None
    is_active: bool = True
    status: str
    eligible: bool = False
    is_participating: bool = False
    participant_count: int | None = None


class ParticipateResponse(BaseModel):
    status: str
    competition: CompetitionRead

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

class SquadCreate(BaseModel):
    name: str
    activity: str = "Neighborhood walk"
    location: str = "City"
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
    steps_count: int = 0
    verification_status: str

class StepSyncRequest(BaseModel):
    steps: int = Field(ge=0)
    active_minutes: int | None = Field(default=None, ge=0)

class StepSyncResponse(BaseModel):
    steps: int
    total_points: int
    streak: int
    streak_score: int
    streak_gained: int = 0

class StartMissionPayload(BaseModel):
    steps: int | None = 0


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


class PresenceUpdate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    is_sharing: bool = True


class PresenceRead(BaseModel):
    user_id: int
    latitude: float
    longitude: float
    is_sharing: bool
    updated_at: datetime


class NearbyUserRead(BaseModel):
    id: int
    name: str
    avatar: str
    initials: str
    latitude: float
    longitude: float
    distance_m: float
    distance_label: str
    total_points: int = 0
    streak: int = 0
    updated_at: datetime
    is_current_user: bool = False


class NearbyPresenceResponse(BaseModel):
    latitude: float
    longitude: float
    radius_m: float
    count: int
    me: NearbyUserRead | None = None
    nearby: list[NearbyUserRead]


class BuddyUserRead(BaseModel):
    id: int
    name: str
    avatar: str
    initials: str
    total_points: int
    streak: int
    fitness_level: str = "Beginner"
    connected_at: datetime | None = None


class BuddyInviteCreate(BaseModel):
    to_user_id: int = Field(gt=0)
    message: str = Field(default="", max_length=200)


class BuddyInviteRead(BaseModel):
    id: int
    from_user_id: int
    to_user_id: int
    message: str
    status: str
    created_at: datetime
    from_user: BuddyUserRead
    to_user: BuddyUserRead


class BuddyConnectResponse(BaseModel):
    status: str
    invite: BuddyInviteRead
    buddy: BuddyUserRead


class FitnessPlanGenerateRequest(BaseModel):
    fitness_level: str = "Beginner"
    goal: str = "active"
    daily_minutes: int = Field(default=30, ge=15, le=120)
    preferred_windows: list[str] = Field(default_factory=lambda: ["Morning", "Evening"])
    focus_areas: list[str] = Field(default_factory=lambda: ["Walking", "Strength"])


class FitnessPlanSlotRead(BaseModel):
    id: str
    time: str
    title: str
    duration: int
    category: str
    notes: str


class FitnessPlanGenerateResponse(BaseModel):
    fitness_level: str
    goal: str
    daily_minutes: int
    preferred_windows: list[str]
    focus_areas: list[str]
    schedule: list[FitnessPlanSlotRead]
    source: str = "ai"


class CoachChatMessage(BaseModel):
    role: str = "user"
    content: str = Field(min_length=1, max_length=4000)


class CoachChatContext(BaseModel):
    fitness_level: str | None = None
    goal: str | None = None
    daily_minutes: int | None = None
    focus_areas: list[str] | None = None


class CoachChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[CoachChatMessage] = Field(default_factory=list, max_length=24)
    context: CoachChatContext | None = None


class CoachChatResponse(BaseModel):
    reply: str
