from enum import Enum
from typing import List, Optional
from pydantic import BaseModel


class Role(str, Enum):
    admin = "admin"
    moderator = "moderator"
    user = "user"


class UserRegister(BaseModel):
    user_id: str
    cf_handle: str
    password: str
    internal_default_rated: bool = True
    trusted_score: int = 0

class UserLogin(BaseModel):
    cf_handle: str
    password: str


class UserUpdate(BaseModel):
    cf_handle: Optional[str] = None
    password: Optional[str] = None
    internal_default_rated: Optional[bool] = None
    trusted_score: Optional[int] = None


class UserOut(BaseModel):
    user_id: str
    cf_handle: str
    internal_default_rated: bool
    trusted_score: int

    class Config:
        orm_mode = True


class GroupRegister(BaseModel):
    group_id: str
    group_name: str
    creator_user_id: str 


class GroupUpdate(BaseModel):
    group_id: str
    group_name: Optional[str] = None


class GroupMembershipAdd(BaseModel):
    user_id: str
    group_id: str
    role: Role = Role.user
    user_group_rating: int = 0


class GroupMembershipRemove(BaseModel):
    user_id: str
    group_id: str


class GroupMembershipOut(BaseModel):
    user_id: str
    group_id: str
    role: Role
    user_group_rating: int

    class Config:
        orm_mode = True


class GroupOut(BaseModel):
    group_id: str
    group_name: str
    memberships: List[GroupMembershipOut] = []

    class Config:
        orm_mode = True


class ContestRegistration(BaseModel):
    contest_id: str
    group_id: str
    user_id: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# late binding for forward refs
GroupOut.update_forward_refs()
