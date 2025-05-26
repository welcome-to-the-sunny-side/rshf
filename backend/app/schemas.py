from enum import Enum
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime


class Role(str, Enum):
    admin = "admin"
    moderator = "moderator"
    user = "user"


class UserRegister(BaseModel):
    user_id: str
    cf_handle: str
    password: str
    role: Role = Role.user
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
    role: Optional[Role] = None

class UserOut(BaseModel):
    user_id: str
    cf_handle: str
    internal_default_rated: bool
    trusted_score: int
    role: Role

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
    user_group_max_rating: int
    timestamp: datetime 

    class Config:
        orm_mode = True

class GroupOutFull(BaseModel):
    group_id: str
    group_name: str
    group_description: Optional[str] = None
    is_private: bool = False
    timestamp: datetime = None
    memberships: List[GroupMembershipOut] = []
    
    class Config:
        orm_mode = True

class GroupOut(BaseModel):
    group_id: str
    group_name: str
    group_description: Optional[str] = None
    is_private: bool = False
    timestamp: datetime = None
    member_count: int = 0
    
    class Config:
        orm_mode = True


class ContestRegistration(BaseModel):
    contest_id: str
    group_id: str
    user_id: str

    rating_before: Optional[int] = None
    rating_after: Optional[int] = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ContestParticipationOut(BaseModel):
    user_id: str
    group_id: str
    contest_id: str
    rating_before: Optional[int] = None
    rating_after: Optional[int] = None
    rank: Optional[int] = None

    class Config:
        orm_mode = True


class ContestOut(BaseModel):
    contest_id: str
    contest_name: str
    platform: str
    start_time_posix: int
    duration_seconds: Optional[int] = None
    link: str
    internal_contest_identifier: Optional[str] = None
    standings: Optional[dict] = None
    finished: bool

    class Config:
        orm_mode = True


class UserOut(BaseModel):
    user_id: str
    cf_handle: str
    internal_default_rated: bool
    trusted_score: int
    role: Role
    email_id: Optional[str] = None
    group_memberships: List[GroupMembershipOut] = []
    contest_participations: List[ContestParticipationOut] = []
    atcoder_handle: Optional[str] = None
    codechef_handle: Optional[str] = None
    twitter_handle: Optional[str] = None

    class Config:
        orm_mode = True


# ==== reports ====

class ReportCreate(BaseModel):
    group_id: str
    contest_id: str
    reporter_user_id: str
    respondent_user_id: str
    report_description: str


class ReportResolve(BaseModel):
    report_id: str
    resolved_by: str                # must be mod/admin in that group
    resolve_message: Optional[str] = None


class ReportOut(BaseModel):
    report_id: str
    group_id: str
    contest_id: str
    reporter_user_id: str
    respondent_user_id: str
    report_description: str
    timestamp: datetime
    resolved: bool
    resolved_by: Optional[str] = None
    resolve_message: Optional[str] = None

    class Config:
        orm_mode = True


# ==== announcements ====

class AnnouncementCreate(BaseModel):
    group_id: str
    title: str
    content: str


class AnnouncementUpdate(BaseModel):
    announcement_id: str
    title: Optional[str] = None
    content: Optional[str] = None


class AnnouncementOut(BaseModel):
    announcement_id: str
    group_id: str
    timestamp: datetime
    title: str
    content: str

    class Config:
        orm_mode = True


# GroupSingle schema for single group endpoint
class GroupSingle(BaseModel):
    group_id: str
    group_name: str
    group_description: Optional[str] = None
    is_private: bool = False
    timestamp: datetime = None
    memberships: List[GroupMembershipOut] = []
    
    class Config:
        orm_mode = True

# Extension query schemas
class ExtensionQuery1Request(BaseModel):
    group_id: str
    cf_handles: List[str]

class ExtensionQuery1Response(BaseModel):
    ratings: List[Optional[int]]

# Custom data models

class CustomMembershipData(BaseModel):
    cf_handle: str
    role: Role
    user_group_rating: int
    user_group_max_rating: int
    date_joined: datetime
    number_of_rated_contests: int
    
    class Config:
        orm_mode = True

# rebuild forward refs
GroupOut.model_rebuild()
UserOut.model_rebuild()
GroupSingle.model_rebuild()

