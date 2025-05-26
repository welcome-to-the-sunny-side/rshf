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

class Status(str, enum.Enum):
    active = "active"
    pending_user = "pending_user"
    pending_group = "pending_group"
    user_left = "user_left"
    kicked_out = "kicked_out"

class ModelBase(Base):
    __abstract__ = True
    timestamp = Column(DateTime, server_default=func.timezone('UTC', func.now()), nullable=False, index=True)

class User(ModelBase):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True, index=True) 
    # user_id -> username that user will login through
    role = Column(Enum(Role), nullable=False, default=Role.user) 

    # handles
    cf_handle = Column(String, unique=True, index=True, nullable=False)
    atcoder_handle = Column(String, unique=False, index=True, nullable=True)
    codechef_handle = Column(String, unique=False, index=True, nullable=True)
    twitter_handle = Column(String, unique=False, index=True, nullable=True)
    
    internal_default_rated = Column(Boolean, nullable=False, default=True)
    trusted_score = Column(Integer, nullable=False, default=0)
    email_id = Column(String, nullable=False)

    # hqas to be hashed
    hashed_password = Column(String, nullable=False, default=hash_password("devpass"))

    memberships = relationship("GroupMembership", back_populates="user", cascade="all, delete", lazy="dynamic")
    def __repr__(self):
        return f"<User(id={self.user_id}, cf_handle='{self.cf_handle}', trusted_score={self.trusted_score})>"


class Group(ModelBase):
    """
        group specific rating formulas to be implemented later
    """
    __tablename__ = "groups"
    group_id = Column(String, primary_key=True, index=True)
    group_name = Column(String, unique=True, index=True, nullable=False)
    group_description = Column(String, nullable=True)
    is_private = Column(Boolean, nullable=False, default=False)

    memberships = relationship("GroupMembership", back_populates="group", cascade="all, delete", lazy="dynamic")
    def __repr__(self):
        return f"<Group(id={self.group_id}, name='{self.group_name}')>"



class GroupMembership(ModelBase):
    __tablename__ = "group_memberships"

    user_id = Column(String, ForeignKey("users.user_id"))
    group_id = Column(String, ForeignKey("groups.group_id"))
    role = Column(Enum(Role), nullable=False, default=Role.user)

    user_group_rating = Column(Integer, nullable=False, default=1500)
    user_group_max_rating = Column(Integer, nullable=False, default=1500)
    
    status = Column(Enum(Status), nullable=False, default=Status.active)

    __table_args__ = (PrimaryKeyConstraint('user_id', 'group_id'),)

    user = relationship("User", back_populates="memberships")
    group = relationship("Group", back_populates="memberships")

    def __repr__(self):
        return f"<GroupMembership(user_id={self.user_id}, group_id={self.group_id}, role={self.role}, rating={self.user_group_rating})>"


class Contest(ModelBase):
    __tablename__ = "contests"
    contest_id = Column(String, primary_key=True, index=True)
    contest_name = Column(String, nullable=False)
    platform = Column(String, nullable=False, default="Codeforces")
    start_time_posix = Column(Integer, nullable=False, index=True)
    duration_seconds = Column(Integer, nullable=True)
    link = Column(String, nullable=False)
    internal_contest_identifier = Column(String, nullable=True)
    standings = Column(JSON, nullable=True)
    finished = Column(Boolean, nullable=False, default=False)
    group_views = Column(JSON, nullable=True)

    participations = relationship("ContestParticipation", back_populates="contest", cascade="all, delete")
    def __repr__(self):
        return f"<Contest(id={self.contest_id}, name={self.contest_name})>"



class ContestParticipation(ModelBase):
    __tablename__ = "contest_participations"

    user_id = Column(String, ForeignKey("users.user_id"), primary_key=True)
    group_id = Column(String, ForeignKey("groups.group_id"), primary_key=True)
    contest_id = Column(String, ForeignKey("contests.contest_id"), primary_key=True)

    rank = Column(Integer, nullable=True)
    delta = Column(Integer, nullable=True)
    rating_before = Column(Integer, nullable=True)
    rating_after = Column(Integer, nullable=True)

    user = relationship("User")    
    group = relationship("Group")
    contest = relationship("Contest", back_populates="participations")

    def __repr__(self):
        return f"<ContestParticipation(user_id={self.user_id}, group_id={self.group_id}, contest_id={self.contest_id})>"



class Report(ModelBase):
    __tablename__ = "reports"

    report_id = Column(String, primary_key=True, index=True)
    group_id = Column(String, ForeignKey("groups.group_id"), nullable=False, index=True)
    contest_id = Column(String, ForeignKey("contests.contest_id"), nullable=False, index=True)

    reporter_user_id = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)
    respondent_user_id = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)

    # rating snapshots
    reporter_rating_at_report_time = Column(Integer, nullable=True)
    respondent_rating_at_report_time = Column(Integer, nullable=True)
    resolver_rating_at_resolve_time = Column(Integer, nullable=True)
    

    report_description = Column(String, nullable=False)
    resolved = Column(Boolean, nullable=False, default=False, index=True)
    resolved_by = Column(String, ForeignKey("users.user_id"), nullable=True, index=True)
    resolve_message = Column(String, nullable=True)
    resolve_timestamp = Column(DateTime, server_default=func.timezone('UTC', func.now()), nullable=True, index=True)


class Announcement(ModelBase):
    __tablename__ = "announcements"

    announcement_id = Column(String, primary_key=True, index=True)
    group_id = Column(String, ForeignKey("groups.group_id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)