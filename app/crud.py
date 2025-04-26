# app/crud.py
from typing import List, Optional

from sqlalchemy.orm import Session

from app import models
from app.utils import hash_password, verify_password
from app import schemas


# helper enrichers ───────────────────────────────────────────
def _enrich_user(db: Session, user: models.User) -> models.User:
    user.group_memberships = list(user.memberships)
    user.contest_participations = (
        db.query(models.ContestParticipation)
        .filter(models.ContestParticipation.user_id == user.user_id)
        .all()
    )
    return user


def _enrich_group(db: Session, group: models.Group) -> models.Group:
    group.contest_participations = (
        db.query(models.ContestParticipation)
        .filter(models.ContestParticipation.group_id == group.group_id)
        .all()
    )
    return group


# ───────────── user ─────────────
def create_user(db: Session, payload: schemas.UserRegister) -> models.User:
    db_user = models.User(
        user_id=payload.user_id,
        cf_handle=payload.cf_handle,
        hashed_password=hash_password(payload.password),
        internal_default_rated=payload.internal_default_rated,
        trusted_score=payload.trusted_score,
        role=payload.role,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user(db: Session, user_id: str) -> Optional[models.User]:
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    return _enrich_user(db, user) if user else None


def list_users(db: Session) -> List[models.User]:
    users = db.query(models.User).all()
    return [_enrich_user(db, u) for u in users]



def get_user_by_handle(db: Session, cf_handle: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.cf_handle == cf_handle).first()



def update_user(db: Session, user_id: str, payload: schemas.UserUpdate) -> Optional[models.User]:
    user = get_user(db, user_id)
    if not user:
        return None

    if payload.cf_handle is not None:
        user.cf_handle = payload.cf_handle
    if payload.password is not None:
        user.hashed_password = hash_password(payload.password)
    if payload.internal_default_rated is not None:
        user.internal_default_rated = payload.internal_default_rated
    if payload.trusted_score is not None:
        user.trusted_score = payload.trusted_score

    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, user_id: str, password: str) -> Optional[models.User]:
    user = get_user(db, user_id)
    print(user)
    print(password, user.hashed_password)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


# ───────────── group ─────────────
def create_group(db: Session, payload: schemas.GroupRegister) -> models.Group:
    group = models.Group(group_id=payload.group_id, group_name=payload.group_name)
    db.add(group)
    db.commit()
    db.refresh(group)

    # creator joins as admin
    membership = models.GroupMembership(
        user_id=payload.creator_user_id,
        group_id=payload.group_id,
        role=models.Role.admin,
        user_group_rating=0,
    )
    db.add(membership)
    db.commit()
    return group

def get_group(db: Session, group_id: str) -> Optional[models.Group]:
    grp = db.query(models.Group).filter(models.Group.group_id == group_id).first()
    return _enrich_group(db, grp) if grp else None


def list_groups(db: Session) -> List[models.Group]:
    groups = db.query(models.Group).all()
    return [_enrich_group(db, g) for g in groups]


def update_group(db: Session, payload: schemas.GroupUpdate) -> Optional[models.Group]:
    group = get_group(db, payload.group_id)
    if not group:
        return None

    if payload.group_name is not None:
        group.group_name = payload.group_name

    db.commit()
    db.refresh(group)
    return group


# ───────────── membership ─────────────
def add_membership(db: Session, payload: schemas.GroupMembershipAdd) -> models.GroupMembership:
    membership = models.GroupMembership(
        user_id=payload.user_id,
        group_id=payload.group_id,
        role=payload.role,
        user_group_rating=payload.user_group_rating,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


def remove_membership(db: Session, user_id: str, group_id: str) -> bool:
    membership = (
        db.query(models.GroupMembership)
        .filter(
            models.GroupMembership.user_id == user_id,
            models.GroupMembership.group_id == group_id,
        )
        .first()
    )
    if not membership:
        return False
    db.delete(membership)
    db.commit()
    return True


# ───────────── contest participation ─────────────
def register_contest_participation(
    db: Session, payload: schemas.ContestRegistration
) -> models.ContestParticipation:
    participation = models.ContestParticipation(
        user_id=payload.user_id, group_id=payload.group_id, contest_id=payload.contest_id,
        user_group_rating_before=payload.user_group_rating_before,
        user_group_rating_after=payload.user_group_rating_after
    )
    db.add(participation)
    db.commit()
    db.refresh(participation)
    return participation

def filter_contest_participations(
    db: Session,
    gid: Optional[str],
    uid: Optional[str],
    cid: Optional[str],
) -> List[models.ContestParticipation]:
    q = db.query(models.ContestParticipation)
    if gid is not None:
        q = q.filter(models.ContestParticipation.group_id == gid)
    if uid is not None:
        q = q.filter(models.ContestParticipation.user_id == uid)
    if cid is not None:
        q = q.filter(models.ContestParticipation.contest_id == cid)
    return q.all()

# ───────────── membership helpers ─────────────
def get_membership(db: Session, user_id: str, group_id: str) -> Optional[models.GroupMembership]:
    """
    fetch a single membership row or None.
    """
    return (
        db.query(models.GroupMembership)
        .filter(
            models.GroupMembership.user_id == user_id,
            models.GroupMembership.group_id == group_id,
        )
        .first()
    )


def list_groups_for_user(db: Session, user_id: str) -> List[models.Group]:
    """
    all groups a user belongs to. handy for non-admin listing.
    """
    return (
        db.query(models.Group)
        .join(
            models.GroupMembership,
            models.Group.group_id == models.GroupMembership.group_id,
        )
        .filter(models.GroupMembership.user_id == user_id)
        .all()
    )


