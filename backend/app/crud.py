# app/crud.py
from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, asc, desc
from app import models
from app.utils import hash_password, verify_password
from app import schemas
from datetime import datetime, timedelta
from app.codeforces_api import cf_api

# ───────────── user ─────────────
def create_user(db: Session, payload: schemas.UserRegister) -> models.User:
    db_user = models.User(
        user_id=payload.user_id,
        cf_handle=payload.cf_handle,
        email_id=payload.email_id,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user(db: Session, user_id: str) -> Optional[models.User]:
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    return user


def list_users(db: Session) -> List[models.User]:
    users = db.query(models.User).all()
    return users



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
    return grp

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
    user_cf_handle = payload.cf_handle
    if user_cf_handle is None:
        # If cf_handle is not provided in payload, try to get it from the User model
        user = db.query(models.User).filter(models.User.user_id == payload.user_id).first()
        if user and user.cf_handle:
            user_cf_handle = user.cf_handle

    membership = models.GroupMembership(
        user_id=payload.user_id,
        group_id=payload.group_id,
        cf_handle=user_cf_handle,  # Populate the new cf_handle field
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

    user = db.query(models.User).filter(models.User.user_id == payload.user_id).first()
    user_cf_handle = user.cf_handle
    membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.user_id == payload.user_id,
        models.GroupMembership.group_id == payload.group_id,
    ).first()
    rating_before = membership.user_group_rating

    participation = models.ContestParticipation(
        user_id=payload.user_id,
        group_id=payload.group_id,
        contest_id=payload.contest_id,
        cf_handle=user_cf_handle,
        rating_before=rating_before,
    )
    db.add(participation)

    group = db.query(models.Group).filter(models.Group.group_id == payload.group_id).first()
    contest = db.query(models.Contest).filter(models.Contest.contest_id == payload.contest_id).first()
    if payload.group_id not in contest.group_views:
        contest.group_views[payload.group_id] = {
            'total_members': group.memberships.count(),
            'total_participants': 1,
        }
    else:
        contest.group_views[payload.group_id]['total_participants'] += 1

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(contest, "group_views")
    db.commit()
    db.refresh(participation)
    return participation


def deregister_contest_participation(
    db: Session, 
    user_id: str, 
    group_id: str,
    contest_id: str
) -> bool:
    """
    Delete a contest participation and update the contest's group_views.
    
    Args:
        db: Database session
        user_id: ID of the user to deregister
        group_id: ID of the group to deregister from
        contest_id: ID of the contest to deregister from
        
    Returns:
        Boolean indicating whether the deregistration was successful
    """
    # Find the participation
    participation = db.query(models.ContestParticipation).filter(
        models.ContestParticipation.user_id == user_id,
        models.ContestParticipation.group_id == group_id,
        models.ContestParticipation.contest_id == contest_id
    ).first()
    
    if not participation:
        return False
    
    # Update the contest's group_views to decrement the participant count
    contest = db.query(models.Contest).filter(models.Contest.contest_id == contest_id).first()
    if contest and contest.group_views and group_id in contest.group_views:
        if contest.group_views[group_id]['total_participants'] > 0:
            contest.group_views[group_id]['total_participants'] -= 1
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(contest, "group_views")
    
    # Delete the participation
    db.delete(participation)
    db.commit()
    
    return True

def filter_contest_participations(
    db: Session,
    gid: Optional[str] = None,
    uid: Optional[str] = None,
    cid: Optional[str] = None,
) -> List[models.ContestParticipation]:
    # Use joinedload to eagerly load the contest relationship
    q = db.query(models.ContestParticipation).options(joinedload(models.ContestParticipation.contest))
    if gid is not None:
        q = q.filter(models.ContestParticipation.group_id == gid)
    if uid is not None:
        q = q.filter(models.ContestParticipation.user_id == uid)
    if cid is not None:
        q = q.filter(models.ContestParticipation.contest_id == cid)
    return q.all()

def count_contest_participations(
    db: Session,
    group_id: Optional[str] = None,
    user_id: Optional[str] = None,
    contest_id: Optional[str] = None,
) -> int:
    """
    Counts contest participations based on optional filters for group_id, user_id, and contest_id.
    """
    query = db.query(models.ContestParticipation.user_id) # Querying a single column for count is often slightly more efficient
    
    if group_id is not None:
        query = query.filter(models.ContestParticipation.group_id == group_id)
    if user_id is not None:
        query = query.filter(models.ContestParticipation.user_id == user_id)
    if contest_id is not None:
        query = query.filter(models.ContestParticipation.contest_id == contest_id)
        
    return query.count()


def get_contest_participations_range_fetch(
    db: Session,
    gid: Optional[str] = None,
    uid: Optional[str] = None,
    cid: Optional[str] = None,
    sort_by: Optional[schemas.ContestParticipationSortByField] = None,
    sort_dir: Optional[schemas.SortOrder] = schemas.SortOrder.DESC, # Corrected to SortOrder
    offset: int = 0,
    limit: int = 25,
) -> Dict[str, Any]:
    query = db.query(models.ContestParticipation).options(
        joinedload(models.ContestParticipation.user),
        joinedload(models.ContestParticipation.contest) # Eager load contest for potential display
    )

    # Apply filters
    if gid is not None:
        query = query.filter(models.ContestParticipation.group_id == gid)
    if uid is not None:
        query = query.filter(models.ContestParticipation.user_id == uid)
    if cid is not None:
        query = query.filter(models.ContestParticipation.contest_id == cid)

    # Get total count before pagination
    total = query.count()

    # Apply sorting
    if sort_by:
        sort_column = None
        if sort_by == schemas.ContestParticipationSortByField.CF_HANDLE:
            sort_column = models.ContestParticipation.cf_handle # Sort by the local cf_handle
        elif sort_by == schemas.ContestParticipationSortByField.RATING_BEFORE:
            sort_column = models.ContestParticipation.rating_before
        elif sort_by == schemas.ContestParticipationSortByField.RATING_AFTER:
            sort_column = models.ContestParticipation.rating_after
        elif sort_by == schemas.ContestParticipationSortByField.RATING_CHANGE:
            sort_column = models.ContestParticipation.rating_change
        elif sort_by == schemas.ContestParticipationSortByField.RANK:
            sort_column = models.ContestParticipation.rank
        # Example for timestamp if added to ContestParticipationSortByField and model
        # elif sort_by == schemas.ContestParticipationSortByField.TIMESTAMP:
        #     sort_column = models.ContestParticipation.timestamp

        if sort_column is not None:
            if sort_dir == schemas.SortOrder.ASC: # Corrected to SortOrder
                query = query.order_by(sort_column.asc())
            else:
                query = query.order_by(sort_column.desc())
    else: # Default sort if none provided
        # Defaulting to rating_after descending. Change if another default is preferred.
        query = query.order_by(models.ContestParticipation.rating_after.desc())

    # Apply pagination
    items = query.offset(offset).limit(limit).all()

    return {"items": items, "total": total}


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

    # update contest participation objects
    group_rank = dict()
    standingsObj = cf_api.contest_standings(contest.internal_contest_identifier)

    group_view = dict()
    
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

            if part.group_id not in group_view:
                group_view[part.group_id] = {
                    "total_members": part.group.memberships.count(),
                    "total_participants": 0,
                }
            group_view[part.group_id]["total_participants"] += 1

    db.commit()
    print("updated participation objects!!")
    
    print("updating contest object...")
    update_contest(
        db,
        contest_id=contest.contest_id,
        finished=True,
        standings=cf_api.contest_standings(contest.internal_contest_identifier),
        group_views=group_view
    )
    print("updated contest object!!")

    db.commit()
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
    count = db.query(func.count(models.Report.report_id)).scalar()
    report_id = f"r{count + 1}"

    reporter_membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.user_id == payload.reporter_user_id,
        models.GroupMembership.group_id == payload.group_id,
    ).first()
    respondent_membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.user_id == payload.respondent_user_id,
        models.GroupMembership.group_id == payload.group_id,
    ).first()

    reporter_rating_at_report_time = reporter_membership.user_group_rating
    respondent_rating_at_report_time = respondent_membership.user_group_rating

    reporter_cf_handle = reporter_membership.cf_handle
    respondent_cf_handle = respondent_membership.cf_handle
    
    # Get reporter and respondent roles
    respondent_role_before = respondent_membership.role

    rpt = models.Report(
        report_id=report_id, 
        reporter_rating_at_report_time=reporter_rating_at_report_time, 
        respondent_rating_at_report_time=respondent_rating_at_report_time,
        reporter_cf_handle=reporter_cf_handle,
        respondent_cf_handle=respondent_cf_handle,
        respondent_role_before=respondent_role_before,
        respondent_role_after=respondent_role_before,
        accepted=payload.accepted,
        **payload.model_dump(exclude={
            'reporter_cf_handle', 'respondent_cf_handle',
            '', '',
            'respondent_role_before', 'respondent_role_after',
            'accepted'
        }) # Exclude from payload as we are setting them directly
    )
    db.add(rpt)
    db.commit()
    db.refresh(rpt)
    return rpt

def list_reports(
    db: Session,
    report_id: Optional[str] = None,
    group_id: Optional[str] = None,
    contest_id: Optional[str] = None,
    reporter_cf_handle: Optional[str] = None,
    respondent_cf_handle: Optional[str] = None,
    respondent_role_after: Optional[models.Role] = None,
    resolved: Optional[bool] = None,
    resolver_cf_handle: Optional[str] = None,
    accepted: Optional[bool] = None,
) -> List[models.Report]:
    q = db.query(models.Report)
    
    if report_id:
        q = q.filter(models.Report.report_id == report_id)
    if group_id:
        q = q.filter(models.Report.group_id == group_id)
    if contest_id:
        q = q.filter(models.Report.contest_id == contest_id)
    if reporter_cf_handle:
        q = q.filter(models.Report.reporter_cf_handle == reporter_cf_handle)
    if respondent_cf_handle:
        q = q.filter(models.Report.respondent_cf_handle == respondent_cf_handle)
    if respondent_role_after is not None:
        q = q.filter(models.Report.respondent_role_after == respondent_role_after)
    if resolved is not None:
        q = q.filter(models.Report.resolved.is_(resolved))
    if resolver_cf_handle:
        q = q.filter(models.Report.resolver_cf_handle == resolver_cf_handle)
    if accepted is not None:
        q = q.filter(models.Report.accepted.is_(accepted))
    return q.all()


def count_reports(
    db: Session,
    report_id: Optional[str] = None,
    group_id: Optional[str] = None,
    contest_id: Optional[str] = None,
    reporter_cf_handle: Optional[str] = None,
    respondent_cf_handle: Optional[str] = None,
    respondent_role_after: Optional[models.Role] = None,
    resolved: Optional[bool] = None,
    resolver_cf_handle: Optional[str] = None,
    accepted: Optional[bool] = None,
) -> int:
    q = db.query(models.Report)
    
    if report_id:
        q = q.filter(models.Report.report_id == report_id)
    if group_id:
        q = q.filter(models.Report.group_id == group_id)
    if contest_id:
        q = q.filter(models.Report.contest_id == contest_id)
    if reporter_cf_handle:
        q = q.filter(models.Report.reporter_cf_handle == reporter_cf_handle)
    if respondent_cf_handle:
        q = q.filter(models.Report.respondent_cf_handle == respondent_cf_handle)
    if respondent_role_after is not None:
        q = q.filter(models.Report.respondent_role_after == respondent_role_after)
    if resolved is not None:
        q = q.filter(models.Report.resolved.is_(resolved))
    if resolver_cf_handle:
        q = q.filter(models.Report.resolver_cf_handle == resolver_cf_handle)
    if accepted is not None:
        q = q.filter(models.Report.accepted.is_(accepted))
    return q.count()


def resolve_report(db: Session, payload: schemas.ReportResolve) -> Optional[models.Report]:
    rpt = db.query(models.Report).filter(models.Report.report_id == payload.report_id).first()
    if not rpt:
        return None

    resolver_membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.user_id == payload.resolver_user_id,
        models.GroupMembership.group_id == rpt.group_id,
    ).first()
    resolver_rating_at_resolve_time = resolver_membership.user_group_rating
    resolver_cf_handle = resolver_membership.cf_handle
    
    # Get the current roles of reporter and respondent at resolution time
    reporter_membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.user_id == rpt.reporter_user_id,
        models.GroupMembership.group_id == rpt.group_id,
    ).first()
    
    respondent_membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.user_id == rpt.respondent_user_id,
        models.GroupMembership.group_id == rpt.group_id,
    ).first()
    
    # Update the 'after' roles to reflect current roles at resolution time
    
    if respondent_membership:
        rpt.respondent_role_after = respondent_membership.role

    rpt.resolved = True
    rpt.resolver_cf_handle = resolver_cf_handle
    rpt.resolver_user_id = payload.resolver_user_id
    rpt.resolver_cf_handle = resolver_cf_handle
    rpt.resolve_message = payload.resolve_message
    rpt.resolver_rating_at_resolve_time = resolver_rating_at_resolve_time
    rpt.resolve_timestamp = datetime.utcnow() # type: ignore
    rpt.resolve_time_stamp = int(datetime.utcnow().timestamp())
    db.commit()
    db.refresh(rpt)
    return rpt

def get_reports_range_fetch(
    db: Session,
    group_id: Optional[str] = None,
    contest_id: Optional[str] = None,
    reporter_cf_handle: Optional[str] = None,
    respondent_cf_handle: Optional[str] = None,
    respondent_role_after: Optional[models.Role] = None,
    resolved: Optional[bool] = None,
    resolver_cf_handle: Optional[str] = None,
    accepted: Optional[bool] = None,
    sort_by: Optional[schemas.ReportSortByField] = schemas.ReportSortByField.REPORT_DATE,
    sort_order: Optional[schemas.SortOrder] = schemas.SortOrder.DESC,
    skip: int = 0,
    limit: int = 25,
) -> Dict[str, Any]:
    """
    Fetches a range of reports with filtering, sorting, and pagination.
    """
    query = db.query(models.Report)

    # Apply filters
    if group_id:
        query = query.filter(models.Report.group_id == group_id)
    if contest_id:
        query = query.filter(models.Report.contest_id == contest_id)
    if reporter_cf_handle:
        query = query.filter(models.Report.reporter_cf_handle == reporter_cf_handle)
    if respondent_cf_handle:
        query = query.filter(models.Report.respondent_cf_handle == respondent_cf_handle)
    if respondent_role_after is not None:
        query = query.filter(models.Report.respondent_role_after == respondent_role_after)
    if resolved is not None:
        query = query.filter(models.Report.resolved == resolved)
    if resolver_cf_handle:
        query = query.filter(models.Report.resolver_cf_handle == resolver_cf_handle)
    if accepted is not None:
        query = query.filter(models.Report.accepted.is_(accepted))

    # Get total count before pagination for the filtered query
    total = query.count()

    # Apply sorting
    sort_column_map = {
        schemas.ReportSortByField.REPORT_ID: models.Report.report_id,
        schemas.ReportSortByField.CONTEST_ID: models.Report.contest_id,
        schemas.ReportSortByField.REPORTER_CF_HANDLE: models.Report.reporter_cf_handle,
        schemas.ReportSortByField.RESPONDENT_CF_HANDLE: models.Report.respondent_cf_handle,
        schemas.ReportSortByField.REPORT_DATE: models.Report.timestamp,
        schemas.ReportSortByField.RESOLVER_CF_HANDLE: models.Report.resolver_cf_handle,
        schemas.ReportSortByField.RESOLVE_DATE: models.Report.resolve_time_stamp,
        schemas.ReportSortByField.ACCEPTED: models.Report.accepted,
    }

    sort_expression = sort_column_map.get(sort_by, models.Report.timestamp)

    if sort_order == schemas.SortOrder.DESC:
        query = query.order_by(desc(sort_expression))
    else:
        query = query.order_by(asc(sort_expression))

    # Apply pagination
    items = query.offset(skip).limit(limit).all()

    return {"items": items, "total": total}


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

def count_group_members_with_custom_data(db: Session, group_id: str) -> int:
    """
    Counts the number of members in a group that have custom data.
    This is determined by counting GroupMembership entries that have a valid corresponding User.
    
    Args:
        db: Database session
        group_id: ID of the group
        
    Returns:
        Integer count of members with custom data.
    """
    count = (
        db.query(models.GroupMembership.user_id)
        .join(models.User, models.GroupMembership.user_id == models.User.user_id)
        .filter(models.GroupMembership.group_id == group_id)
        .count()
    )
    return count


def get_group_custom_membership_data(db: Session, group_id: str) -> List[schemas.CustomMembershipData]:
    """
    Get custom membership data for all members in a group.
    (Note: number_of_rated_contests was removed from this response as per user request)
    
    Args:
        db: Database session
        group_id: ID of the group
        
    Returns:
        List of CustomMembershipData objects
    """
    # Get all memberships for the group
    memberships = (
        db.query(models.GroupMembership)
        .filter(models.GroupMembership.group_id == group_id)
        .all()
    )
    
    if not memberships:
        return []
    
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
            # number_of_rated_contests removed
        )
        result.append(custom_data)
    
    return result

def get_group_custom_membership_data_paginated(
    db: Session, 
    group_id: str,
    sort_by: schemas.GroupMemberSortByField,
    sort_order: schemas.SortOrder,
    offset: int,
    limit: int
) -> List[schemas.CustomMembershipData]:
    """
    Get paginated and sorted custom membership data for a group.
    """
    query = (
        db.query(models.GroupMembership, models.User)
        .join(models.User, models.GroupMembership.user_id == models.User.user_id)
        .filter(models.GroupMembership.group_id == group_id)
    )

    # Map schema sort fields to model columns
    sort_column_map = {
        schemas.GroupMemberSortByField.CF_HANDLE: models.User.cf_handle,
        schemas.GroupMemberSortByField.ROLE: models.GroupMembership.role,
        schemas.GroupMemberSortByField.USER_GROUP_RATING: models.GroupMembership.user_group_rating,
        schemas.GroupMemberSortByField.USER_GROUP_MAX_RATING: models.GroupMembership.user_group_max_rating,
        schemas.GroupMemberSortByField.DATE_JOINED: models.GroupMembership.timestamp,
    }
    
    sort_expression = sort_column_map[sort_by]

    if sort_order == schemas.SortOrder.DESC:
        query = query.order_by(desc(sort_expression))
    else:
        query = query.order_by(asc(sort_expression))
    
    paginated_results = query.offset(offset).limit(limit).all()
    
    result_data = []
    for membership, user in paginated_results:
        custom_data = schemas.CustomMembershipData(
            cf_handle=user.cf_handle,
            role=membership.role,
            user_group_rating=membership.user_group_rating,
            user_group_max_rating=membership.user_group_max_rating,
            date_joined=membership.timestamp,
        )
        result_data.append(custom_data)
        
    return result_data

# ───────────── extension queries ───────────────

def count_group_memberships(db, group_id: str) -> int:
    """
    Count all GroupMemberships for a group (no status/user filtering).
    """
    return db.query(models.GroupMembership).filter(models.GroupMembership.group_id == group_id).count()


def get_group_memberships_paginated(
    db,
    group_id: str,
    sort_by: schemas.GroupMemberSortByField,
    sort_order: schemas.SortOrder,
    offset: int,
    limit: int
):
    """
    Get paginated and sorted GroupMemberships for a group (no status/user filtering).
    """
    sort_column_map = {
        schemas.GroupMemberSortByField.CF_HANDLE: models.GroupMembership.cf_handle,
        schemas.GroupMemberSortByField.ROLE: models.GroupMembership.role,
        schemas.GroupMemberSortByField.USER_GROUP_RATING: models.GroupMembership.user_group_rating,
        schemas.GroupMemberSortByField.USER_GROUP_MAX_RATING: models.GroupMembership.user_group_max_rating,
        schemas.GroupMemberSortByField.DATE_JOINED: models.GroupMembership.timestamp,
    }
    sort_expression = sort_column_map[sort_by]
    query = db.query(models.GroupMembership).filter(models.GroupMembership.group_id == group_id)
    if sort_order == schemas.SortOrder.DESC:
        query = query.order_by(desc(sort_expression))
    else:
        query = query.order_by(asc(sort_expression))
    memberships = query.offset(offset).limit(limit).all()
    return memberships


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

