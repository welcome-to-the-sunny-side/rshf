from enum import Enum
from typing import List, Optional, Dict # Added Dict
from pydantic import BaseModel
from datetime import datetime


class Role(str, Enum):
    admin = "admin"
    moderator = "moderator"
    user = "user"
    outsider = "outsider"


class GroupMemberSortByField(str, Enum):
    CF_HANDLE = "cf_handle"
    ROLE = "role"
    USER_GROUP_RATING = "user_group_rating"
    USER_GROUP_MAX_RATING = "user_group_max_rating"
    DATE_JOINED = "date_joined"


class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"


class UserRegister(BaseModel):
    user_id: str
    cf_handle: str
    email_id: str
    password: str
    role: Role = Role.user

class UserLogin(BaseModel):
    cf_handle: str
    password: str


class UserUpdate(BaseModel):
    cf_handle: Optional[str] = None
    password: Optional[str] = None
    role: Optional[Role] = None

class UserOut(BaseModel):
    user_id: str
    cf_handle: str
    role: Role

    class Config:
        from_attributes = True


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
    cf_handle: Optional[str] = None # Added cf_handle
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
    cf_handle: Optional[str] = None # Added cf_handle
    timestamp: datetime 

    class Config:
        from_attributes = True

class GroupOutFull(BaseModel):
    group_id: str
    group_name: str
    group_description: Optional[str] = None
    is_private: bool = False
    timestamp: datetime = None
    memberships: List[GroupMembershipOut] = []
    
    class Config:
        from_attributes = True

class GroupOut(BaseModel):
    group_id: str
    group_name: str
    group_description: Optional[str] = None
    is_private: bool = False
    timestamp: datetime = None
    member_count: int = 0
    
    class Config:
        from_attributes = True


class ContestRegistration(BaseModel):
    contest_id: str
    group_id: str
    user_id: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CountResponse(BaseModel):
    count: int

class ContestParticipationOut(BaseModel):
    user_id: str
    group_id: str
    contest_id: str
    rating_before: Optional[int] = None
    rating_after: Optional[int] = None
    rank: Optional[int] = None
    rating_change: Optional[int] = None 
    cf_handle: Optional[str] = None
    contest: Optional['ContestOut'] = None

    class Config:
        from_attributes = True


# Specific model for the structure within group_views
class GroupViewDetail(BaseModel):
    total_members: int
    total_participants: int


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
    group_views: Optional[Dict[str, GroupViewDetail]] = None

    class Config:
        from_attributes = True


class UserOut(BaseModel):
    user_id: str
    cf_handle: str
    role: Role
    email_id: Optional[str] = None
    group_memberships: List[GroupMembershipOut] = []
    contest_participations: List[ContestParticipationOut] = []
    atcoder_handle: Optional[str] = None
    codechef_handle: Optional[str] = None
    twitter_handle: Optional[str] = None

    class Config:
        from_attributes = True


# ==== reports ====

class ReportCreate(BaseModel):
    group_id: str
    contest_id: str
    reporter_user_id: str
    respondent_user_id: str
    # cf_handles will be populated by the backend based on user_ids
    reporter_cf_handle: Optional[str] = None
    respondent_cf_handle: Optional[str] = None
    report_description: str

    respondent_role_before: Optional[Role] = None
    respondent_role_after: Optional[Role] = None
    accepted: Optional[bool] = None


class ReportResolve(BaseModel):
    report_id: str
    resolver_user_id: str                # must be mod/admin in that group
    resolver_cf_handle: Optional[str] = None
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
    resolver_user_id: Optional[str] = None
    resolve_message: Optional[str] = None
    reporter_cf_handle: Optional[str] = None
    respondent_cf_handle: Optional[str] = None
    resolver_cf_handle: Optional[str] = None
    accepted: Optional[bool] = None

    reporter_rating_at_report_time: Optional[int] = None
    respondent_rating_at_report_time: Optional[int] = None
    resolver_rating_at_resolve_time: Optional[int] = None
    resolve_time_stamp: Optional[datetime] = None
    

    respondent_role_before: Optional[Role] = None
    respondent_role_after: Optional[Role] = None

    class Config:
        from_attributes = True


class ReportSortByField(str, Enum):
    REPORT_ID = "report_id"
    CONTEST_ID = "contest_id"
    REPORTER_CF_HANDLE = "reporter_cf_handle"
    RESPONDENT_CF_HANDLE = "respondent_cf_handle"
    REPORT_DATE = "timestamp"  # Corresponds to models.Report.timestamp
    RESOLVER_CF_HANDLE = "resolver_cf_handle"
    RESOLVE_DATE = "resolve_time_stamp" # Corresponds to models.Report.resolve_time_stamp (DateTime)
    ACCEPTED = "accepted" # Sort by accepted field

class ReportRangeFetchResponse(BaseModel):
    items: List[ReportOut]
    total: int

    class Config:
        from_attributes = True


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
        from_attributes = True

class ContestParticipationSortByField(str, Enum):
    CF_HANDLE = "cf_handle"
    RATING_BEFORE = "rating_before"
    RATING_AFTER = "rating_after"
    RATING_CHANGE = "rating_change"
    RANK = "rank"

class ContestParticipationRangeFetchResponse(BaseModel):
    items: List[ContestParticipationOut]
    total: int

    class Config:
        from_attributes = True


# --- Group Membership Custom Data ---for single group endpoint
class GroupSingle(BaseModel):
    group_id: str
    group_name: str
    group_description: Optional[str] = None
    is_private: bool = False
    timestamp: datetime = None
    memberships: List[GroupMembershipOut] = []
    
    class Config:
        from_attributes = True

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
    # number_of_rated_contests: int # Field removed as per user request
    
    class Config:
        from_attributes = True

# rebuild forward refs
GroupOut.model_rebuild()
UserOut.model_rebuild()
GroupSingle.model_rebuild()
ContestParticipationOut.model_rebuild()

