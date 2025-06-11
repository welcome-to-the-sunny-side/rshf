from sqlalchemy import Integer, Column, String, ForeignKey, Enum, PrimaryKeyConstraint, Boolean, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils import hash_password
import enum
from sqlalchemy import DateTime, func

class Role(str, enum.Enum):
    admin = "admin"
    moderator = "moderator"
    user = "user"
    kicked = "kicked"

class ContestType(str, enum.Enum):
    DIV1 = "div1"
    DIV2 = "div2"
    DIV3 = "div3"
    DIV4 = "div4"
    EDU = "edu"

    @property
    def rating_upper_bound(self) -> int:
        return {
            ContestType.DIV1: 9999,
            ContestType.DIV2: 2099,
            ContestType.DIV3: 1599,
            ContestType.DIV4: 1399,
            ContestType.EDU: 2099,
        }[self]

class ModelBase(Base):
    __abstract__ = True
    timestamp = Column(DateTime, server_default=func.timezone('UTC', func.now()), nullable=False, index=True)

class User(ModelBase):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True, index=True) # same as cf_handle initially: tech debt for december ft. shrey
    role = Column(Enum(Role), nullable=False, default=Role.user) 

    # handles
    cf_handle = Column(String, unique=True, index=True, nullable=False)
    atcoder_handle = Column(String, unique=False, index=True, nullable=True)
    codechef_handle = Column(String, unique=False, index=True, nullable=True)
    twitter_handle = Column(String, unique=False, index=True, nullable=True)
    email_id = Column(String, nullable=False, default="not_registered@rshf.net")

    # registered flag -> has the user actually registered?
    is_registered = Column(Boolean, nullable=False, default=True)

    # hqas to be hashed
    hashed_password = Column(String, nullable=False, default=hash_password("devpass"))

    memberships = relationship("GroupMembership", back_populates="user", cascade="all, delete", lazy="dynamic")
    participations = relationship("ContestParticipation", back_populates="user", cascade="all, delete", lazy="dynamic")
    def __repr__(self):
        return f"<User(id={self.user_id}, cf_handle='{self.cf_handle}')>"


class Group(ModelBase):
    """
        group specific rating formulas to be implemented later
    """
    __tablename__ = "groups"
    group_id = Column(String, primary_key=True, index=True)
    group_name = Column(String, nullable=True, index=True)  # restored group_name
    group_description = Column(String, nullable=True)
    is_private = Column(Boolean, nullable=False, default=False)

    memberships = relationship("GroupMembership", back_populates="group", cascade="all, delete", lazy="dynamic")
    participations = relationship("ContestParticipation", back_populates="group", cascade="all, delete", lazy="dynamic")
    def __repr__(self):
        return f"<Group(id={self.group_id}, name='{self.group_name}')>"

class GroupMembership(ModelBase):
    __tablename__ = "group_memberships"

    user_id = Column(String, ForeignKey("users.user_id"), index=True)
    group_id = Column(String, ForeignKey("groups.group_id"), index=True)
    role = Column(Enum(Role), nullable=False, default=Role.user, index=True)

    user_group_rating = Column(Integer, nullable=False, default=1500, index=True)
    user_group_max_rating = Column(Integer, nullable=False, default=1500, index=True)
    
    cf_handle = Column(String, nullable=True, index=True) # Added cf_handle

    __table_args__ = (PrimaryKeyConstraint('user_id', 'group_id'),)

    user = relationship("User", back_populates="memberships")
    group = relationship("Group", back_populates="memberships")

    def __repr__(self):
        return f"<GroupMembership(user_id={self.user_id}, group_id={self.group_id}, cf_handle={self.cf_handle}, role={self.role}, rating={self.user_group_rating})>"

class Contest(ModelBase):
    __tablename__ = "contests"
    contest_id = Column(String, primary_key=True, index=True)
    contest_name = Column(String, nullable=False)
    platform = Column(String, nullable=False, default="Codeforces", index=True)
    start_time_posix = Column(Integer, nullable=False, index=True)
    duration_seconds = Column(Integer, nullable=True)
    link = Column(String, nullable=False)
    internal_contest_identifier = Column(String, nullable=True)
    finished = Column(Boolean, nullable=False, default=False)
    group_views = Column(JSON, nullable=True) # this is derived data

    contest_type = Column(Enum(ContestType), nullable=False, default=ContestType.DIV1)
    processed = Column(Boolean, nullable=False, default=False)

    participations = relationship("ContestParticipation", back_populates="contest", cascade="all, delete")
    def __repr__(self):
        return f"<Contest(id={self.contest_id}, name={self.contest_name})>"


class ContestParticipation(ModelBase):
    __tablename__ = "contest_participations"

    user_id = Column(String, ForeignKey("users.user_id"), primary_key=True, index=True)
    group_id = Column(String, ForeignKey("groups.group_id"), primary_key=True, index=True)
    contest_id = Column(String, ForeignKey("contests.contest_id"), primary_key=True, index=True)

    rank = Column(Integer, nullable=True, index=True)
    delta = Column(Integer, nullable=True)
    rating_before = Column(Integer, nullable=True, index=True)
    rating_after = Column(Integer, nullable=True, index=True)
    rating_change = Column(Integer, nullable=True, index=True)
    cf_handle = Column(String, nullable=True, index=True)

    user = relationship("User", back_populates="participations")    
    group = relationship("Group", back_populates="participations")
    contest = relationship("Contest", back_populates="participations")

    def __repr__(self):
        return f"<ContestParticipation(user_id={self.user_id}, group_id={self.group_id}, contest_id={self.contest_id}, cf_handle={self.cf_handle})>"

class Report(ModelBase):
    __tablename__ = "reports"

    report_id = Column(String, primary_key=True, index=True)
    group_id = Column(String, ForeignKey("groups.group_id"), nullable=False, index=True)
    contest_id = Column(String, ForeignKey("contests.contest_id"), nullable=False, index=True)

    reporter_user_id = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)
    respondent_user_id = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)

    reporter_cf_handle = Column(String, nullable=True, index=True)
    respondent_cf_handle = Column(String, nullable=True, index=True)

    # rating snapshots
    reporter_rating_at_report_time = Column(Integer, nullable=True)
    respondent_rating_at_report_time = Column(Integer, nullable=True)
    resolver_rating_at_resolve_time = Column(Integer, nullable=True)
    
    # roles before and after report resolution
    respondent_role_before = Column(Enum(Role), nullable=True)
    respondent_role_after = Column(Enum(Role), nullable=True, index=True)

    reporter_role_before = Column(Enum(Role), nullable=True)
    

    report_description = Column(String, nullable=False)
    resolved = Column(Boolean, nullable=False, default=False, index=True)
    resolver_user_id = Column(String, ForeignKey("users.user_id"), nullable=True, index=True)
    resolver_cf_handle = Column(String, nullable=True, index=True)
    resolve_message = Column(String, nullable=True)
    accepted = Column(Boolean, nullable=True, index=True)
    resolve_timestamp = Column(DateTime, nullable=True, index=True)

class Announcement(ModelBase):
    __tablename__ = "announcements"

    announcement_id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    group_id = Column(String, ForeignKey("groups.group_id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)

class Request(ModelBase):
    __tablename__ = "requests"

    request_id = Column(String, primary_key=True, index=True)
    group_id = Column(String, ForeignKey("groups.group_id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)
    
    resolved = Column(Boolean, nullable=False, default=False, index=True)
    accepted = Column(Boolean, nullable=True, index=True)
    resolve_timestamp = Column(DateTime, nullable=True, index=True)
    resolver_user_id = Column(String, ForeignKey("users.user_id"), nullable=True, index=True)
    resolver_cf_handle = Column(String, nullable=True, index=True)


class BannedUser(ModelBase):
    __tablename__ = "banned_users"
    cf_handle = Column(String, primary_key=True, index=True)