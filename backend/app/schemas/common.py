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
    total_points: int
    streak: int
    active_minutes: int
    avatar: str

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
    points_required: int = Field(gt=0)
    stock: int = Field(default=0, ge=0)
    image: str = "/rewards/default.png"

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
    points_required: int
    stock: int
    image: str

class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    challenge_id: int
    status: str
    started_at: datetime
    completed_at: datetime | None
    points_earned: int
    verification_status: str
