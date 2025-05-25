# app/crud.py
from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models
from app.utils import hash_password, verify_password
from app import schemas
from datetime import datetime, timedelta
from app.codeforces_api import cf_api

# helper enrichers ───────────────────────────────────────────
def _enrich_user(db: Session, user: models.User) -> models.User:
    # Load group memberships for the user
    user.group_memberships = list(user.memberships)
    
    # Load contest participations for the user
    user.contest_participations = (
        db.query(models.ContestParticipation)
        .filter(models.ContestParticipation.user_id == user.user_id)
        .all()
    )
    
    # No need to explicitly assign handles and other attributes
    # as they are already part of the User model
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


def list_groups(db: Session):
    groups = (
        db.query(
            models.Group,
            func.count(models.GroupMembership.user_id).label("member_count")
        )
        .outerjoin(models.GroupMembership, models.Group.group_id == models.GroupMembership.group_id)
        .group_by(models.Group.group_id)
        .all()
    )
    # don't enrich here 
    return groups


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
    gid: Optional[str] = None,
    uid: Optional[str] = None,
    cid: Optional[str] = None,
) -> List[models.ContestParticipation]:
    q = db.query(models.ContestParticipation)
    if gid is not None:
        q = q.filter(models.ContestParticipation.group_id == gid)
    if uid is not None:
        q = q.filter(models.ContestParticipation.user_id == uid)
    if cid is not None:
        q = q.filter(models.ContestParticipation.contest_id == cid)
    return q.all()

# ------------------------- contest -------------------------

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

def map_cf_contest_to_internal(cf_contest: Dict[str, Any]) -> Dict[str, Any]:
    contest_id = f"cf_{cf_contest['id']}"
    return {
        "contest_id": contest_id,
        "contest_name": cf_contest.get("name", "Unknown Contest"),
        "platform": "Codeforces",
        "start_time_posix": cf_contest.get("startTimeSeconds", 0),
        "duration_seconds": cf_contest.get("durationSeconds", 0),
        "link": f"https://codeforces.com/contest/{cf_contest['id']}",
        "internal_contest_identifier": (cf_contest['id']),
        "finished": cf_contest.get("phase", "BEFORE") == "FINISHED"
    }

def update_upcoming_contests(db: Session):
    """
    update all upcoming contests in the database.
    """
    upcoming = cf_api.fetch_upcoming_contests()
    to_add = []
    for contest in upcoming:
        # check if contest is already in db
        if get_contest_by_internal_identifier(db, contest['id']) is None:
            to_add.append(models.Contest(
                **map_cf_contest_to_internal(contest)
            ))
    
    db.add_all(to_add)
    db.commit()

def update_contest_info_from_cf_api(db: Session, cf_contest_id: str, group_id: Optional[str] = None):
    """
        update all contest related tables using standings fetched from cf api
    """

    contest = get_contest_by_internal_identifier(db, cf_contest_id)
    if contest is None:
        print("contest not in db")
        return

    print("updating contest object...")
    update_contest(
        db,
        contest_id=contest.contest_id,
        finished=True,
        standings=cf_api.contest_standings(contest.internal_contest_identifier)
    )
    print("updated contest object!!")

    # update contest participation objects
    group_rank = dict()
    standingsObj = cf_api.contest_standings(contest.internal_contest_identifier)
    
    print("updating participation objects...")
    updated_parts = []
    for row in standingsObj["rows"]:
        user = get_user_by_handle(db, row["handle"])
        if user is None:
            continue
        
        # just get all participations satisying uid=handle, cid=contest_id
        parts = filter_contest_participations(db, uid=user.user_id, cid=contest.contest_id, gid=group_id)
        for part in parts:
            membership = get_membership(db, user.user_id, part.group_id)
            part.rating_before = membership.user_group_rating
            part.rank = group_rank.get(part.group_id, 0)
            part.took_part = True
            group_rank[part.group_id] = group_rank.get(part.group_id, 0) + 1
            updated_parts.append(part)
    
    db.commit()
    print("updated participation objects!!")
    return updated_parts
    

def update_finished_contests(db: Session, group_id: Optional[str] = None, cutoff_days: Optional[int] = None):
    """
        fetch and update recently finished contests from cf
    """
    finished = cf_api.fetch_finished_contests(cutoff_days)
    to_add = []
    for contest in finished:
        # check if contest is already in db -> contest HAS to be already in db to update its standings
        db_contest = get_contest_by_internal_identifier(db, contest['id'])
        if db_contest is None:
            continue
        update_contest_info_from_cf_api(db, contest['id'], group_id)
        

        


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

def get_contest_by_internal_identifier(db: Session, id: Any) -> Optional[models.Contest]:
    """
        query a contest by its codeforces id
    """
    return db.query(models.Contest).filter(models.Contest.internal_contest_identifier == str(id)).first()


def create_contest(db: Session, contest_data: Dict[str, Any]) -> Optional[models.Contest]:
    """
    Create a new contest in the database.
    
    Args:
        db: Database session
        contest_data: Dictionary containing contest information
        
    Returns:
        Created Contest object or None if error
    """
    try:
        contest = models.Contest(**contest_data)
        db.add(contest)
        db.commit()
        db.refresh(contest)
        return contest
    except Exception as e:
        db.rollback()
        print(f"Error creating contest: {e}")
        return None


def update_contest(
    db: Session,
    contest_id: str,
    finished: Optional[bool] = None,
    contest_name: Optional[str] = None,
    start_time_posix: Optional[int] = None,
    duration_seconds: Optional[int] = None,
    standings: Optional[Dict[str, Any]] = None
) -> Optional[models.Contest]:
    """
    Update an existing contest.
    
    Args:
        db: Database session
        contest_id: ID of the contest to update
        finished: New finished status
        contest_name: New contest name
        start_time_posix: New start time
        duration_seconds: New duration
        standings: Contest standings data
        
    Returns:
        Updated Contest object or None if not found
    """
    contest = db.query(models.Contest).filter(models.Contest.contest_id == contest_id).first()
    if not contest:
        return None
    
    if finished is not None:
        contest.finished = finished
    if contest_name is not None:
        contest.contest_name = contest_name
    if start_time_posix is not None:
        contest.start_time_posix = start_time_posix
    if duration_seconds is not None:
        contest.duration_seconds = duration_seconds
    if standings is not None:
        contest.standings = standings
    
    db.commit()
    db.refresh(contest)
    return contest




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
    return q.order_by(models.Announcement.timestamp.desc()).all()


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


# ───────────── custom group data queries ───────────────

def get_group_custom_membership_data(db: Session, group_id: str) -> List[schemas.CustomMembershipData]:
    """
    Get custom membership data for all members in a group including number of rated contests.
    
    Args:
        db: Database session
        group_id: ID of the group
        
    Returns:
        List of CustomMembershipData objects with enriched contest participation info
    """
    # Get all memberships for the group
    memberships = (
        db.query(models.GroupMembership)
        .filter(models.GroupMembership.group_id == group_id)
        .all()
    )
    
    if not memberships:
        return []
    
    # Get all contest participations for this group in one query to avoid N+1 problem
    participations = (
        db.query(models.ContestParticipation)
        .filter(models.ContestParticipation.group_id == group_id)
        .all()
    )
    
    # Create a dictionary to count participations by user_id
    participation_counts = {}
    for p in participations:
        if p.user_id in participation_counts:
            participation_counts[p.user_id] += 1
        else:
            participation_counts[p.user_id] = 1
    
    # Create the custom data objects
    result = []
    for membership in memberships:
        # Get the user to access the cf_handle
        user = db.query(models.User).filter(models.User.user_id == membership.user_id).first()
        if not user:
            continue  # Skip if user not found
            
        # Create the custom data object
        custom_data = schemas.CustomMembershipData(
            cf_handle=user.cf_handle,
            role=membership.role,
            user_group_rating=membership.user_group_rating,
            user_group_max_rating=membership.user_group_max_rating,
            date_joined=membership.timestamp,
            number_of_rated_contests=participation_counts.get(membership.user_id, 0)
        )
        result.append(custom_data)
    
    return result

# ───────────── extension queries ───────────────

def get_ratings_by_cf_handles(db: Session, group_id: str, cf_handles: List[str]) -> List[Optional[int]]:
    """
    Get user_group_ratings for a list of cf_handles for a specific group.
    
    Args:
        db: Database session
        group_id: ID of the group
        cf_handles: List of Codeforces handles
        
    Returns:
        List of ratings, with None for users without a membership in the group
    """
    # First get the users by cf_handles
    user_mappings = {}
    for handle in cf_handles:
        user = db.query(models.User).filter(models.User.cf_handle == handle).first()
        if user:
            user_mappings[handle] = user.user_id
    
    # Now get the group memberships for those users
    ratings = []
    for handle in cf_handles:
        if handle in user_mappings:
            user_id = user_mappings[handle]
            membership = (
                db.query(models.GroupMembership)
                .filter(
                    models.GroupMembership.user_id == user_id,
                    models.GroupMembership.group_id == group_id
                )
                .first()
            )
            if membership:
                ratings.append(membership.user_group_rating)
            else:
                ratings.append(None)
        else:
            ratings.append(None)
    
    return ratings

