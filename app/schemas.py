from pydantic import BaseModel
from enum import Enum
from typing import Optional

class Role(str, Enum):
    admin = "admin"
    moderator = "moderator"
    user = "user"

class UserBase(BaseModel):
    cf_handle: str
    username: str
    internal_default_rated: bool = True
    trusted_score: int = 0

class UserCreate(UserBase):
    user_id: str
    password: str

class User(UserBase):
    user_id: str

    class Config:
        orm_mode = True

class GroupBase(BaseModel):
    group_name: str

class GroupCreate(GroupBase):
    group_id: str

class Group(GroupBase):
    group_id: str

    class Config:
        orm_mode = True

class GroupMembershipBase(BaseModel):
    role: Role = Role.user
    user_group_rating: int = 0

class GroupMembershipCreate(GroupMembershipBase):
    user_id: str
    group_id: str

class GroupMembership(GroupMembershipBase):
    user_id: str
    group_id: str

    class Config:
        orm_mode = True

class ContestBase(BaseModel):
    cf_contest_id: int

class ContestCreate(ContestBase):
    contest_id: str

class Contest(ContestBase):
    contest_id: str

    class Config:
        orm_mode = True

class ContestParticipationBase(BaseModel):
    user_id: str
    group_id: str
    contest_id: str

class ContestParticipation(ContestParticipationBase):
    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None
