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
        user_id=payload.user_id,
        group_id=payload.group_id,
        contest_id=payload.contest_id,
        rating_before=payload.rating_before,
        rating_after=payload.rating_after,
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


def list_contests(
    db: Session,
    finished: Optional[bool] = None,
) -> List[models.Contest]:
    """
    List all contests, optionally filtered by the finished flag.
    
    Args:
        db: Database session
        finished: Optional boolean to filter contests by their finished status
        
    Returns:
        List of Contest objects
    """
    q = db.query(models.Contest)
    if finished is not None:
        q = q.filter(models.Contest.finished == finished)
    return q.all()


def get_contest(db: Session, contest_id: str) -> Optional[models.Contest]:
    """
    Get a single contest by its ID.
    
    Args:
        db: Database session
        contest_id: ID of the contest to retrieve
        
    Returns:
        Contest object or None if not found
    """
    return db.query(models.Contest).filter(models.Contest.contest_id == contest_id).first()

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

# ───────────── reports ─────────────

def create_report(db: Session, payload: schemas.ReportCreate) -> models.Report:
    rpt = models.Report(**payload.model_dump())
    db.add(rpt)
    db.commit()
    db.refresh(rpt)
    return rpt


def list_reports(
    db: Session,
    group_id: Optional[str] = None,
    unresolved_only: bool = False,
) -> List[models.Report]:
    q = db.query(models.Report)
    if group_id:
        q = q.filter(models.Report.group_id == group_id)
    if unresolved_only:
        q = q.filter(models.Report.resolved.is_(False))
    return q.all()


def resolve_report(db: Session, payload: schemas.ReportResolve) -> Optional[models.Report]:
    rpt = db.query(models.Report).filter(models.Report.report_id == payload.report_id).first()
    if not rpt:
        return None
    rpt.resolved = True
    rpt.resolved_by = payload.resolved_by
    rpt.resolve_message = payload.resolve_message
    db.commit()
    db.refresh(rpt)
    return rpt


# ───────────── announcements ─────────────

def create_announcement(db: Session, payload: schemas.AnnouncementCreate) -> models.Announcement:
    anmt = models.Announcement(**payload.model_dump())
    db.add(anmt)
    db.commit()
    db.refresh(anmt)
    return anmt


def list_announcements(db: Session, group_id: Optional[str] = None) -> List[models.Announcement]:
    q = db.query(models.Announcement)
    if group_id:
        q = q.filter(models.Announcement.group_id == group_id)
    return q.order_by(models.Announcement.create_date.desc()).all()


def update_announcement(db: Session, payload: schemas.AnnouncementUpdate) -> Optional[models.Announcement]:
    anmt = (
        db.query(models.Announcement)
        .filter(models.Announcement.announcement_id == payload.announcement_id)
        .first()
    )
    if not anmt:
        return None
    if payload.title is not None:
        anmt.title = payload.title
    if payload.content is not None:
        anmt.content = payload.content
    db.commit()
    db.refresh(anmt)
    return anmt


