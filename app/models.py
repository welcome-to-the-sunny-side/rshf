from sqlalchemy import Integer, Column, String, ForeignKey, Enum, PrimaryKeyConstraint, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils import hash_password
import enum
from sqlalchemy import DateTime, func

class Role(str, enum.Enum):
    admin = "admin"
    moderator = "moderator"
    user = "user"


class User(Base):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True, index=True) 
    # user_id -> username that user will login through
    role = Column(Enum(Role), nullable=False, default=Role.user) 
    # Gloabl role

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
    is_pending_user = Column(Boolean, nullable=False, default=False)
    is_pending_group = Column(Boolean, nullable=False, default=False)

    __table_args__ = (PrimaryKeyConstraint('user_id', 'group_id'),)

    user = relationship("User", back_populates="memberships")
    group = relationship("Group", back_populates="memberships")

    def __repr__(self):
        return f"<GroupMembership(user_id={self.user_id}, group_id={self.group_id}, role={self.role}, rating={self.user_group_rating})>"


class Contest(Base):
    __tablename__ = "contests"

    contest_id = Column(String, primary_key=True, index=True)
    cf_contest_id = Column(Integer, unique=True, nullable=False, index=True)

    participations = relationship("ContestParticipation", back_populates="contest", cascade="all, delete")

    def __repr__(self):
        return f"<Contest(id={self.contest_id}, cf_contest_id={self.cf_contest_id})>"



class ContestParticipation(Base):
    __tablename__ = "contest_participations"

    user_id = Column(String, ForeignKey("users.user_id"), primary_key=True)
    group_id = Column(String, ForeignKey("groups.group_id"), primary_key=True)
    contest_id = Column(String, ForeignKey("contests.contest_id"), primary_key=True)
    user_group_rating_before = Column(Integer, nullable=True)
    user_group_rating_after = Column(Integer, nullable=True)

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
    resolve_message = Column(String, nullable=False)