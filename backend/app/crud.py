# app/crud.py
from __future__ import annotations

from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, asc, desc
from datetime import datetime

from app import models
from app.utils import hash_password, verify_password
from app import schemas
from app.codeforces_api import cf_api

# ───────────────────────────── internal enrichers ─────────────────────────────
def _enrich_user(db: Session, user: models.User) -> models.User:
    """Attach memberships and participations so Pydantic can serialise them."""
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

# ───────────────────────────── USERS ─────────────────────────────
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
    usr = db.query(models.User).filter(models.User.user_id == user_id).first()
    return _enrich_user(db, usr) if usr else None


def list_users(db: Session) -> List[models.User]:
    return [_enrich_user(db, u) for u in db.query(models.User).all()]


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
    if payload.role is not None:
        user.role = payload.role
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, user_id: str, password: str) -> Optional[models.User]:
    user = get_user(db, user_id)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

# ───────────────────────────── GROUPS ─────────────────────────────
def create_group(db: Session, payload: schemas.GroupRegister) -> models.Group:
    """
    A group's display label is now its `group_id`; descriptive metadata is optional.
    """
    grp = models.Group(
        group_id=payload.group_id,
        group_name=payload.group_name if hasattr(payload, 'group_name') and payload.group_name else payload.group_id,
        group_description=payload.group_description,
        is_private=payload.is_private,
        extension_link=payload.extension_link,
    )
    db.add(grp)
    db.commit()
    db.refresh(grp)

    # creator joins as admin
    db.add(
        models.GroupMembership(
            user_id=payload.creator_user_id,
            group_id=payload.group_id,
            role=models.Role.admin,
            user_group_rating=1_500,
        )
    )
    db.commit()
    return grp


def get_group(db: Session, group_id: str) -> Optional[models.Group]:
    return db.query(models.Group).filter(models.Group.group_id == group_id).first()


def list_groups(db: Session):
    """
    Returns (Group, member_count) tuples.
    """
    rows = (
        db.query(models.Group, func.count(models.GroupMembership.user_id).label("member_count"))
        .outerjoin(models.GroupMembership, models.Group.group_id == models.GroupMembership.group_id)
        .group_by(models.Group.group_id)
        .all()
    )
    return rows


def update_group(db: Session, payload: schemas.GroupUpdate):
    grp = db.query(models.Group).filter(models.Group.group_id == payload.group_id).first()
    if not grp:
        raise Exception("group not found")
    if payload.group_name is not None:
        grp.group_name = payload.group_name
    if payload.group_description is not None:
        grp.group_description = payload.group_description
    if payload.is_private is not None:
        grp.is_private = payload.is_private
    if payload.extension_link is not None:
        grp.extension_link = payload.extension_link
    db.commit()
    db.refresh(grp)
    return grp

# ───────────────────────────── MEMBERSHIPS ─────────────────────────────
def add_membership(db: Session, payload: schemas.GroupMembershipAdd) -> models.GroupMembership:
    cf_handle = payload.cf_handle
    if cf_handle is None:
        usr = db.query(models.User).filter(models.User.user_id == payload.user_id).first()
        cf_handle = usr.cf_handle if usr else None

    m = models.GroupMembership(
        user_id=payload.user_id,
        group_id=payload.group_id,
        cf_handle=cf_handle,
        role=payload.role,
        user_group_rating=payload.user_group_rating or 1_500,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def remove_membership(db: Session, user_id: str, group_id: str) -> bool:
    m = (
        db.query(models.GroupMembership)
        .filter(models.GroupMembership.user_id == user_id, models.GroupMembership.group_id == group_id)
        .first()
    )
    if not m:
        return False
    db.delete(m)
    db.commit()
    return True


def get_membership(db: Session, user_id: str, group_id: str) -> Optional[models.GroupMembership]:
    return (
        db.query(models.GroupMembership)
        .filter(models.GroupMembership.user_id == user_id, models.GroupMembership.group_id == group_id)
        .first()
    )
    

def update_membership_role(db: Session, user_id: str, group_id: str, new_role: models.Role) -> Optional[models.GroupMembership]:
    """
    Update the role of a user in a group.
    
    Args:
        db: Database session
        user_id: ID of the user whose role is being changed
        group_id: ID of the group
        new_role: New role to assign to the user
        
    Returns:
        Updated GroupMembership object if successful, None if the membership doesn't exist
    """
    membership = get_membership(db, user_id, group_id)
    if not membership:
        return None
    
    membership.role = new_role
    db.commit()
    db.refresh(membership)
    return membership

# ───────────────────────────── CONTEST PARTICIPATIONS ─────────────────────────────
def register_contest_participation(
    db: Session, payload: schemas.ContestRegistration
) -> models.ContestParticipation:
    usr = db.query(models.User).filter(models.User.user_id == payload.user_id).first()
    mem = get_membership(db, payload.user_id, payload.group_id)

    part = models.ContestParticipation(
        user_id=payload.user_id,
        group_id=payload.group_id,
        contest_id=payload.contest_id,
        cf_handle=usr.cf_handle,
        rating_before=mem.user_group_rating,
    )
    db.add(part)

    contest = db.query(models.Contest).filter(models.Contest.contest_id == payload.contest_id).first()
    if contest.group_views is None:
        contest.group_views = {}

    views = contest.group_views.setdefault(
        payload.group_id,
        {"total_members": mem.group.memberships.count(), "total_participants": 0},
    )
    views["total_participants"] += 1

    from sqlalchemy.orm.attributes import flag_modified

    flag_modified(contest, "group_views")
    db.commit()
    db.refresh(part)
    return part


def deregister_contest_participation(db: Session, user_id: str, group_id: str, contest_id: str) -> bool:
    part = (
        db.query(models.ContestParticipation)
        .filter(
            models.ContestParticipation.user_id == user_id,
            models.ContestParticipation.group_id == group_id,
            models.ContestParticipation.contest_id == contest_id,
        )
        .first()
    )
    if not part:
        return False

    contest = db.query(models.Contest).filter(models.Contest.contest_id == contest_id).first()
    if contest and contest.group_views and group_id in contest.group_views:
        contest.group_views[group_id]["total_participants"] = max(
            0, contest.group_views[group_id]["total_participants"] - 1
        )
        from sqlalchemy.orm.attributes import flag_modified

        flag_modified(contest, "group_views")

    db.delete(part)
    db.commit()
    return True


def filter_contest_participations(
    db: Session,
    gid: Optional[str] = None,
    uid: Optional[str] = None,
    cid: Optional[str] = None,
) -> List[models.ContestParticipation]:
    q = db.query(models.ContestParticipation).options(joinedload(models.ContestParticipation.contest))
    if gid:
        q = q.filter(models.ContestParticipation.group_id == gid)
    if uid:
        q = q.filter(models.ContestParticipation.user_id == uid)
    if cid:
        q = q.filter(models.ContestParticipation.contest_id == cid)
    return q.all()


def count_contest_participations(
    db: Session,
    group_id: Optional[str] = None,
    user_id: Optional[str] = None,
    contest_id: Optional[str] = None,
) -> int:
    q = db.query(models.ContestParticipation.user_id)
    if group_id:
        q = q.filter(models.ContestParticipation.group_id == group_id)
    if user_id:
        q = q.filter(models.ContestParticipation.user_id == user_id)
    if contest_id:
        q = q.filter(models.ContestParticipation.contest_id == contest_id)
    return q.count()


def get_contest_participations_range_fetch(
    db: Session,
    gid: Optional[str] = None,
    uid: Optional[str] = None,
    cid: Optional[str] = None,
    sort_by: Optional[schemas.ContestParticipationSortByField] = None,
    sort_dir: schemas.SortOrder = schemas.SortOrder.DESC,
    offset: int = 0,
    limit: int = 25,
) -> Dict[str, Any]:
    q = db.query(models.ContestParticipation).options(
        joinedload(models.ContestParticipation.user),
        joinedload(models.ContestParticipation.contest),
    )

    if gid:
        q = q.filter(models.ContestParticipation.group_id == gid)
    if uid:
        q = q.filter(models.ContestParticipation.user_id == uid)
    if cid:
        q = q.filter(models.ContestParticipation.contest_id == cid)

    total = q.count()

    sort_map = {
        schemas.ContestParticipationSortByField.CF_HANDLE: models.ContestParticipation.cf_handle,
        schemas.ContestParticipationSortByField.RATING_BEFORE: models.ContestParticipation.rating_before,
        schemas.ContestParticipationSortByField.RATING_AFTER: models.ContestParticipation.rating_after,
        schemas.ContestParticipationSortByField.RATING_CHANGE: models.ContestParticipation.rating_change,
        schemas.ContestParticipationSortByField.RANK: models.ContestParticipation.rank,
    }
    if sort_by:
        col = sort_map[sort_by]
        q = q.order_by(asc(col) if sort_dir == schemas.SortOrder.ASC else desc(col))
    else:
        q = q.order_by(desc(models.ContestParticipation.rating_after))

    items = q.offset(offset).limit(limit).all()
    return {"items": items, "total": total}

# ───────────────────────────── CONTEST METADATA & CF SYNC ─────────────────────────────
def list_contests(db: Session, finished: Optional[bool] = None) -> List[models.Contest]:
    q = db.query(models.Contest)
    if finished is not None:
        q = q.filter(models.Contest.finished == finished)
    return q.all()


def map_cf_contest_to_internal(cf_contest: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "contest_id": f"cf_{cf_contest['id']}",
        "contest_name": cf_contest.get("name", "Unknown Contest"),
        "platform": "Codeforces",
        "start_time_posix": cf_contest.get("startTimeSeconds", 0),
        "duration_seconds": cf_contest.get("durationSeconds", 0),
        "link": f"https://codeforces.com/contest/{cf_contest['id']}",
        "internal_contest_identifier": str(cf_contest["id"]),
        "finished": cf_contest.get("phase", "BEFORE") == "FINISHED",
    }

def get_contest(db: Session, contest_id: str) -> Optional[models.Contest]:
    """
    Fetch a single Contest row by primary-key `contest_id`.
    """
    return (
        db.query(models.Contest)
        .filter(models.Contest.contest_id == contest_id)
        .first()
    )


def get_contest_by_internal_identifier(db: Session, iid: str | int) -> Optional[models.Contest]:
    return (
        db.query(models.Contest)
        .filter(models.Contest.internal_contest_identifier == str(iid))
        .first()
    )


def create_contest(db: Session, data: Dict[str, Any]) -> Optional[models.Contest]:
    try:
        c = models.Contest(**data)
        db.add(c)
        db.commit()
        db.refresh(c)
        return c
    except Exception:
        db.rollback()
        return None


def update_contest(
    db: Session,
    contest_id: str,
    *,
    finished: Optional[bool] = None,
    contest_name: Optional[str] = None,
    start_time_posix: Optional[int] = None,
    duration_seconds: Optional[int] = None,
    standings: Optional[Dict[str, Any]] = None,
    group_views: Optional[Dict[str, Any]] = None,
) -> Optional[models.Contest]:
    c = db.query(models.Contest).filter(models.Contest.contest_id == contest_id).first()
    if not c:
        return None
    if finished is not None:
        c.finished = finished
    if contest_name is not None:
        c.contest_name = contest_name
    if start_time_posix is not None:
        c.start_time_posix = start_time_posix
    if duration_seconds is not None:
        c.duration_seconds = duration_seconds
    if standings is not None:
        c.standings = standings
    if group_views is not None:
        c.group_views = group_views
    db.commit()
    db.refresh(c)
    return c


def update_upcoming_contests(db: Session) -> None:
    upcoming = cf_api.fetch_upcoming_contests()
    to_add = [
        models.Contest(**map_cf_contest_to_internal(cf_c))
        for cf_c in upcoming
        if get_contest_by_internal_identifier(db, cf_c["id"]) is None
    ]
    if to_add:
        db.add_all(to_add)
        db.commit()


def update_contest_info_from_cf_api(db: Session, cf_contest_id: str, group_id: Optional[str] = None) -> None:
    contest = get_contest_by_internal_identifier(db, cf_contest_id)
    if contest is None:
        return

    standings = cf_api.contest_standings(contest.internal_contest_identifier)
    group_rank: dict[str, int] = {}
    group_views: dict[str, dict[str, int]] = {}

    for row in standings["rows"]:
        handle = row["handle"]
        user = get_user_by_handle(db, handle)
        if not user:
            continue

        parts = filter_contest_participations(
            db, uid=user.user_id, cid=contest.contest_id, gid=group_id
        )
        for part in parts:
            mem = get_membership(db, user.user_id, part.group_id)
            part.rating_before = mem.user_group_rating
            part.rank = group_rank.get(part.group_id, 0)
            group_rank[part.group_id] = part.rank + 1

            gv = group_views.setdefault(
                part.group_id,
                {"total_members": mem.group.memberships.count(), "total_participants": 0},
            )
            gv["total_participants"] += 1

    db.commit()

    update_contest(
        db,
        contest.contest_id,
        finished=True,
        standings=standings,
        group_views=group_views,
    )


def update_finished_contests(db: Session, group_id: Optional[str] = None, cutoff_days: Optional[int] = None) -> None:
    finished = cf_api.fetch_finished_contests(cutoff_days)
    for cf_c in finished:
        if get_contest_by_internal_identifier(db, cf_c["id"]):
            update_contest_info_from_cf_api(db, cf_c["id"], group_id)

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
    
    # Set the 'after' roles from the payload (as required by new schema)
    rpt.reporter_role_after = payload.reporter_role_after
    rpt.respondent_role_after = payload.respondent_role_after

    # Modify reporter/respondent memberships as per role change or removal
    if payload.reporter_role_after == models.Role.kicked:
        remove_membership(db, rpt.reporter_user_id, rpt.group_id)
    elif reporter_membership:
        update_membership_role(db, rpt.reporter_user_id, rpt.group_id, payload.reporter_role_after)

    if payload.respondent_role_after == models.Role.kicked:
        remove_membership(db, rpt.respondent_user_id, rpt.group_id)
    elif respondent_membership:
        update_membership_role(db, rpt.respondent_user_id, rpt.group_id, payload.respondent_role_after)

    rpt.resolved = True
    rpt.resolver_cf_handle = resolver_cf_handle
    rpt.resolver_user_id = payload.resolver_user_id
    rpt.resolve_message = payload.resolve_message
    rpt.accepted = payload.accepted
    rpt.resolver_rating_at_resolve_time = resolver_rating_at_resolve_time
    current_time = datetime.utcnow()
    rpt.resolve_timestamp = current_time
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
        schemas.ReportSortByField.RESOLVE_DATE: models.Report.resolve_timestamp,
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

