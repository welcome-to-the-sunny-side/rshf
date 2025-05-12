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

class User(Base):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True, index=True) 
    role = Column(Enum(Role), nullable=False, default=Role.user) 
    create_date = Column(DateTime, server_default=func.now(), nullable=False)

    # handles
    cf_handle = Column(String, unique=True, index=True, nullable=False)
    atcoder_handle = Column(String, unique=False, index=True, nullable=True)
    codechef_handle = Column(String, unique=False, index=True, nullable=True)
    twitter_handle = Column(String, unique=False, index=True, nullable=True)
    
    internal_default_rated = Column(Boolean, nullable=False, default=True)
    trusted_score = Column(Integer, nullable=False, default=0)

    # hqas to be hashed
    hashed_password = Column(String, nullable=False, default=hash_password("devpass"))

    memberships = relationship("GroupMembership", back_populates="user", cascade="all, delete")
    def __repr__(self):
        return f"<User(id={self.user_id}, cf_handle='{self.cf_handle}', trusted_score={self.trusted_score})>"


class Group(Base):
    """
        group specific rating formulas to be implemented later
    """
    __tablename__ = "groups"
    group_id = Column(String, primary_key=True, index=True)
    group_name = Column(String, unique=True, index=True, nullable=False)
    group_description = Column(String, nullable=True)
    is_private = Column(Boolean, nullable=False, default=False)
    create_date = Column(DateTime, server_default=func.now(), nullable=False)

    memberships = relationship("GroupMembership", back_populates="group", cascade="all, delete")
    def __repr__(self):
        return f"<Group(id={self.group_id}, name='{self.group_name}')>"



class GroupMembership(Base):
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


class Contest(Base):
    __tablename__ = "contests"

    contest_id = Column(String, primary_key=True, index=True)
    cf_contest_id = Column(Integer, unique=True, nullable=False, index=True)
    cf_standings = Column(JSON, nullable=True)
    finished = Column(Boolean, nullable=False, default=False)

    # metadata
    start_time = Column(DateTime, nullable=False, index=True)
    duration_seconds = Column(Integer, nullable=False)
    contest_name = Column(String, nullable=False, index=True)

    participations = relationship("ContestParticipation", back_populates="contest", cascade="all, delete")
    def __repr__(self):
        return f"<Contest(id={self.contest_id}, cf_contest_id={self.cf_contest_id})>"



class ContestParticipation(Base):
    __tablename__ = "contest_participations"

    user_id = Column(String, ForeignKey("users.user_id"), primary_key=True, index=True)
    group_id = Column(String, ForeignKey("groups.group_id"), primary_key=True, index=True)
    contest_id = Column(String, ForeignKey("contests.contest_id"), primary_key=True, index=True)
    rating_before = Column(Integer, nullable=False) # rating at the time of registration


    # these fields will be updated AFTER the contest finishes
    took_part = Column(Boolean, nullable=True)
    rank = Column(Integer, nullable=True)
    rating_after = Column(Integer, nullable=True)

    user = relationship("User")    
    group = relationship("Group")
    contest = relationship("Contest", back_populates="participations")

    def __repr__(self):
        return f"<ContestParticipation(user_id={self.user_id}, group_id={self.group_id}, contest_id={self.contest_id})>"



class Report(Base):
    __tablename__ = "reports"

    report_id = Column(String, primary_key=True, index=True)
    group_id = Column(String, ForeignKey("groups.group_id"), nullable=False)
    contest_id = Column(String, ForeignKey("contests.contest_id"), nullable=False)

    reporter_user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    respondent_user_id = Column(String, ForeignKey("users.user_id"), nullable=False)

    report_description = Column(String, nullable=False)
    create_date = Column(DateTime, server_default=func.now(), nullable=False)

    resolved = Column(Boolean, nullable=False, default=False)
    resolved_by = Column(String, ForeignKey("users.user_id"), nullable=True)
    resolve_message = Column(String, nullable=True)

class Post(Base):
    __tablename__ = "posts"

    post_id = Column(String, primary_key=True, index=True)
    create_date = Column(DateTime, server_default=func.now(), nullable=False)
    title = Column(String, nullable=False)
    post_url = Column(String, nullable=False)



class Announcement(Base):
    __tablename__ = "announcements"

    announcement_id = Column(String, primary_key=True, index=True)
    group_id = Column(String, ForeignKey("groups.group_id"), nullable=False)
    create_date = Column(DateTime, server_default=func.now(), nullable=False)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)