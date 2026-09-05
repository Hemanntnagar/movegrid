from pydantic import BaseModel, ConfigDict, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: str
    move_points: int
    streak: int
    is_admin: bool

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

class VerifyRequest(BaseModel):
    code: str

class RewardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str
    cost: int
    inventory: int
