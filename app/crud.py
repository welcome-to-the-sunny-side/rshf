from sqlalchemy.orm import Session
from app import models, schemas
from app.utils import hash_password, verify_password

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.cf_handle == username).first()

def get_user(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.user_id == user_id).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_pw = hash_password(user.password)
    db_user = models.User(
        user_id=user.user_id,
        cf_handle=user.cf_handle,
        hashed_password=hashed_pw,
        internal_default_rated=user.internal_default_rated,
        trusted_score=user.trusted_score
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def get_group(db: Session, group_id: str):
    return db.query(models.Group).filter(models.Group.group_id == group_id).first()

def create_group(db: Session, group: schemas.GroupCreate):
    db_group = models.Group(
        group_id=group.group_id,
        group_name=group.group_name
    )
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

def add_membership(db: Session, membership: schemas.GroupMembershipCreate):
    db_mem = models.GroupMembership(
        user_id=membership.user_id,
        group_id=membership.group_id,
        role=membership.role,
        user_group_rating=membership.user_group_rating,
    )
    db.add(db_mem)
    db.commit()
    db.refresh(db_mem)
    return db_mem

def get_contest(db: Session, contest_id: str):
    return db.query(models.Contest).filter(models.Contest.contest_id == contest_id).first()

def create_contest(db: Session, contest: schemas.ContestCreate):
    db_contest = models.Contest(
        contest_id=contest.contest_id,
        cf_contest_id=contest.cf_contest_id
    )
    db.add(db_contest)
    db.commit()
    db.refresh(db_contest)
    return db_contest

def add_participation(db: Session, p: schemas.ContestParticipationBase):
    db_p = models.ContestParticipation(
        user_id=p.user_id,
        group_id=p.group_id,
        contest_id=p.contest_id,
    )
    db.add(db_p)
    db.commit()
    db.refresh(db_p)
    return db_p
