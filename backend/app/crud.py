# app/crud.py
from __future__ import annotations

from typing import List, Optional, Dict, Any

from sqlalchemy import orm
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, asc, desc
from datetime import datetime
from fastapi import HTTPException

from app import models
from app.utils import hash_password, verify_password
from app import schemas
from app.codeforces_api import cf_api
from app.schemas import ContestUpdate
from app import rating
from sqlalchemy.orm.attributes import flag_modified
from app.models import ContestType


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
        is_registered=payload.is_registered,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def check_if_user_is_banned(db: Session, cf_handle: str) -> bool:
    return db.query(models.BannedUser).filter(models.BannedUser.cf_handle == cf_handle).first() is not None


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
    if payload.email_id is not None:
        user.email_id = payload.email_id
    if payload.is_registered is not None:
        user.is_registered = payload.is_registered
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, user_id: str, password: str) -> Optional[models.User]:
    user = get_user(db, user_id)
    if not user or user.is_registered == False or not verify_password(password, user.hashed_password):
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


# def list_groups(db: Session):
#     """
#     Returns (Group, member_count) tuples.
#     """
#     rows = (
#         db.query(models.Group, func.count(models.GroupMembership.user_id).label("member_count"))
#         .outerjoin(models.GroupMembership, models.Group.group_id == models.GroupMembership.group_id)
#         .group_by(models.Group.group_id)
#         .all()
#     )
#     return rows

def list_groups(db: Session):
    """
    Returns (Group, member_count) tuples with O(G) complexity.
    """
    # Create a subquery that counts memberships per group
    membership_count = (
        db.query(
            models.GroupMembership.group_id,
            func.count(models.GroupMembership.user_id).label("member_count")
        )
        .group_by(models.GroupMembership.group_id)
        .subquery()
    )
    
    # Query groups and left join with the count subquery
    rows = (
        db.query(
            models.Group,
            func.coalesce(membership_count.c.member_count, 0).label("member_count")
        )
        .outerjoin(
            membership_count,
            models.Group.group_id == membership_count.c.group_id
        )
        .options(
            # Explicitly avoid loading relationships
            orm.lazyload(models.Group.memberships),
            orm.lazyload(models.Group.participations)
        )
        .all()
    )
    
    return rows


def update_group(db: Session, payload: schemas.GroupUpdate):
    grp = db.query(models.Group).filter(models.Group.group_id == payload.group_id).first()
    if not grp:
        raise Exception("group not found")
    
    # Store the original is_private status to check if it changes
    original_is_private = grp.is_private
    
    if payload.group_description is not None:
        grp.group_description = payload.group_description
    if payload.is_private is not None:
        grp.is_private = payload.is_private

    
    # If group is changed from private to public, accept all pending requests
    if original_is_private and payload.is_private is not None and not payload.is_private:
        # Find all unresolved requests for this group
        pending_requests = db.query(models.Request).filter(
            models.Request.group_id == payload.group_id,
            models.Request.resolved == False
        ).all()
        
        # Use the group creator as the resolver
        resolver_user = db.query(models.User).join(models.GroupMembership).filter(
            models.GroupMembership.group_id == payload.group_id,
            models.GroupMembership.role == models.Role.admin
        ).first()
        
        resolver_user_id = resolver_user.user_id if resolver_user else None
        resolver_cf_handle = resolver_user.cf_handle if resolver_user else None
        
        # Mark all requests as resolved and accepted
        for request in pending_requests:
            # Update request fields
            request.resolved = True
            request.accepted = True
            request.resolve_timestamp = datetime.utcnow()
            request.resolver_user_id = resolver_user_id
            request.resolver_cf_handle = resolver_cf_handle
            
            # Create a membership for the requesting user
            membership_exists = db.query(models.GroupMembership).filter(
                models.GroupMembership.user_id == request.user_id,
                models.GroupMembership.group_id == request.group_id
            ).first()
            
            # Only create membership if it doesn't already exist
            if not membership_exists:
                membership_payload = schemas.GroupMembershipAdd(
                    user_id=request.user_id,
                    group_id=request.group_id,
                    role=models.Role.user
                )
                add_membership(db, membership_payload)
    
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
        user_group_rating=1500,
        user_group_max_rating=1500,
    )
    db.add(m)
    db.commit()
    db.refresh(m)

    # update group_views of every contest (increase total_members) that has contest.finished = false
    contests = db.query(models.Contest).filter(models.Contest.finished == False).all()
    for contest in contests:
        if contest.group_views is not None:
            contest.group_views[payload.group_id]["total_members"] += 1
            flag_modified(contest, "group_views")   
            db.add(contest)
            db.commit()

    return m


def remove_membership(db: Session, user_id: str, group_id: str) -> bool:
    m = (
        db.query(models.GroupMembership)
        .filter(models.GroupMembership.user_id == user_id, models.GroupMembership.group_id == group_id)
        .first()
    )
    if not m:
        return False
    # Check if the user is an admin
    if m.role == models.Role.admin:
        # Count number of admins in the group
        admin_count = db.query(models.GroupMembership).filter(
            models.GroupMembership.group_id == group_id,
            models.GroupMembership.role == models.Role.admin
        ).count()
        if admin_count <= 1:
            # Prevent removal if this is the last admin
            raise Exception("Cannot remove the last admin from the group.")
    
    # Delete all contest participations for this user in this group and update group_views for all contests
    contestparticipations = db.query(models.ContestParticipation).filter(
        models.ContestParticipation.user_id == user_id,
        models.ContestParticipation.group_id == group_id
    ).all()
    for part in contestparticipations:
        contest = db.query(models.Contest).filter(models.Contest.contest_id == part.contest_id).first()
        if contest.group_views is not None:
            contest.group_views[group_id]["total_participants"] -= 1
            contest.group_views[group_id]["total_members"] -= 1
            flag_modified(contest, "group_views")   
            db.add(contest)
            db.commit()
        db.delete(part)

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
    contest_name = cf_contest.get("name", "Unknown Contest").lower()
    
    # Determine contest type based on name
    contest_type = models.ContestType.DIV1  # Default to DIV1
    if "div. 1" in contest_name.lower() or "div 1" in contest_name.lower() or "div.1" in contest_name.lower() or "global" in contest_name.lower():
        contest_type = models.ContestType.DIV1
    elif "div. 2" in contest_name.lower() or "div 2" in contest_name.lower() or "div.2" in contest_name.lower():
        contest_type = models.ContestType.DIV2
    elif "div. 3" in contest_name.lower() or "div 3" in contest_name.lower() or "div.3" in contest_name.lower():
        contest_type = models.ContestType.DIV3
    elif "div. 4" in contest_name.lower() or "div 4" in contest_name.lower() or "div.4" in contest_name.lower():
        contest_type = models.ContestType.DIV4
    elif "educational" in contest_name.lower():
        contest_type = models.ContestType.EDU
    else:
        contest_type = models.ContestType.DIV1

    
    return {
        "contest_id": f"cf_{cf_contest['id']}",
        "contest_name": cf_contest.get("name", "Unknown Contest"),
        "platform": "Codeforces",
        "start_time_posix": cf_contest.get("startTimeSeconds", 0),
        "duration_seconds": cf_contest.get("durationSeconds", 0),
        "link": f"https://codeforces.com/contest/{cf_contest['id']}",
        "internal_contest_identifier": str(cf_contest["id"]),
        "finished": cf_contest.get("phase", "BEFORE") == "FINISHED",
        "contest_type": contest_type,
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


def update_contest(db: Session, payload: schemas.ContestUpdate) -> Optional[models.Contest]:
    c = db.query(models.Contest).filter(models.Contest.contest_id == payload.contest_id).first()
    if not c:
        return None

    # .model_dump(exclude_unset=True) converts the entire Pydantic payload,
    # including any nested Pydantic models like GroupViewDetail within group_views,
    # into a dictionary structure suitable for JSON serialization.
    update_data = payload.model_dump(exclude_unset=True) 

    for field, value in update_data.items():
        # The 'value' for 'group_views' (if present in update_data) will already be a Dict[str, Dict],
        # which is what SQLAlchemy needs for the JSON field.
        # The same applies to 'contest_type' if it were a Pydantic model.
        if value is not None: 
            setattr(c, field, value)
            
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

    to_modify = [
        map_cf_contest_to_internal(cf_c)
        for cf_c in upcoming
        if get_contest_by_internal_identifier(db, cf_c["id"]) is not None
    ]

    if to_add:
        db.add_all(to_add)
        db.commit()

    if to_modify:
        for c in to_modify:
            update_contest(db, ContestUpdate(**c))

def fetch_and_add_contest_to_db_from_cf(db: Session, cf_contest_id: str) -> None:
    contest = cf_api.get_full_standings(cf_contest_id)['contest']
    db_contest = models.Contest(**map_cf_contest_to_internal(contest))
    db.add(db_contest)
    db.commit()
    


def update_contest_ratings_for_group(db: Session, group_id: str, contest_id: str):
    # Eagerly load contest_type to ensure it's available and to prevent N+1 issues if accessed later in a loop.
    contest = db.query(models.Contest).options(joinedload(models.Contest.contest_type)).filter(
        models.Contest.contest_id == contest_id
    ).first()

    if not contest or not contest.contest_type:
        # If contest or its type is not found, or contest_type has no rating_upper_bound,
        # it's an issue. Log it (e.g., using app.logger) and return empty list,
        # implying no ratings were updated or participations processed.
        # Consider raising an HTTPException if this is an API-triggered path for clearer error reporting.
        # e.g., from app.logger import logger; logger.warning(f"Contest {contest_id} or its type not found/configured. Skipping rating updates for group {group_id}.")
        return [] 

    valid_participations = db.query(models.ContestParticipation).filter(
        models.ContestParticipation.group_id == group_id,
        models.ContestParticipation.contest_id == contest_id,
        models.ContestParticipation.rank.isnot(None),
        models.ContestParticipation.rating_before <= contest.contest_type.rating_upper_bound # Safe due to the check above
    ).all()

    # apply_codeforces_rating mutates participations in-place and returns the same list.
    updated_participations = rating.apply_codeforces_rating(valid_participations)

    for participation in updated_participations:
        # Ensure user_id and rating_after are available before proceeding.
        if participation.user_id is not None and hasattr(participation, 'rating_after') and participation.rating_after is not None:
            membership = db.query(models.GroupMembership).filter(
                models.GroupMembership.user_id == participation.user_id,
                models.GroupMembership.group_id == group_id  # group_id is available from function arguments
            ).first()

            if membership:
                membership.user_group_rating = participation.rating_after
                # GroupMembership.user_group_max_rating has a default and is not nullable.
                membership.user_group_max_rating = max(membership.user_group_max_rating, participation.rating_after)
                # No explicit db.add(membership) needed as SQLAlchemy tracks changes to managed objects.
    
    db.commit() # Commit all changes (ContestParticipation and GroupMembership) together.
    return updated_participations # Return the list of updated participations.


def update_contest_info_from_cf_api(db: Session, cf_contest_id: str, group_id: Optional[str] = None) -> None:
    contest = get_contest_by_internal_identifier(db, cf_contest_id)
    if contest is None:
        return

    standings = cf_api.get_full_standings(contest.internal_contest_identifier)
    group_rank: dict[str, int] = {}
    group_views: dict[str, dict[str, int]] = {}

    # add unregistered users to db along with dummy memberships to "main"
    unregistered_users = []
    unregistered_memberships = []

    for row in standings["rows"]:
        handle = row["handle"]
        user = get_user_by_handle(db, handle)
        if not user:
            unregistered_users.append(
                models.User(
                    user_id=handle,
                    cf_handle=handle,
                    is_registered=False,
                )
            )
            unregistered_memberships.append(
                models.GroupMembership(
                    user_id=handle,
                    group_id="main",
                    cf_handle=handle,
                    role="user",
                )
            )
            continue

        parts = filter_contest_participations(
            db, uid=user.user_id, cid=contest.contest_id, gid=group_id
        )
        for part in parts:
            mem = get_membership(db, user.user_id, part.group_id)
            part.rank = group_rank.get(part.group_id, 0)
            group_rank[part.group_id] = part.rank + 1

            gv = group_views.setdefault(
                part.group_id,
                {"total_members": mem.group.memberships.count(), "total_participants": 0},
            )
            gv["total_participants"] += 1

    db.add_all(unregistered_users)
    db.commit()

    update_contest(
        db,
        ContestUpdate(
            contest_id=contest.contest_id,
            finished=True,
            standings=standings,
            group_views=group_views,
        )
    )


def update_finished_contests(db: Session, group_id: Optional[str] = None, cutoff_days: Optional[int] = None) -> None:
    finished = cf_api.fetch_finished_contests(cutoff_days)
    updated_contests = []
    for cf_c in finished:
        if get_contest_by_internal_identifier(db, cf_c["id"]):
            update_contest_info_from_cf_api(db, cf_c["id"], group_id)
            updated_contests.append(f"cf_{cf_c['id']}")
    return updated_contests

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
    reporter_role_before = reporter_membership.role

    rpt = models.Report(
        report_id=report_id, 
        reporter_rating_at_report_time=reporter_rating_at_report_time, 
        respondent_rating_at_report_time=respondent_rating_at_report_time,
        reporter_cf_handle=reporter_cf_handle,
        respondent_cf_handle=respondent_cf_handle,
        reporter_role_before=reporter_role_before,
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
    
    respondent_membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.user_id == rpt.respondent_user_id,
        models.GroupMembership.group_id == rpt.group_id,
    ).first()
    
    # Set the 'after' roles from the payload (as required by new schema)
    rpt.respondent_role_after = payload.respondent_role_after

    if(respondent_membership is not None):
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
    count = db.query(func.count(models.Announcement.announcement_id)).scalar()
    announcement_id = f"a{count + 1}"
    anmt = models.Announcement(
        announcement_id=announcement_id,
        group_id=payload.group_id,
        user_id=payload.user_id,
        title=payload.title,
        content=payload.content,
    )
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


def delete_announcement(db: Session, announcement_id: str) -> bool:
    """Delete an announcement by its ID.
    
    Args:
        db: Database session
        announcement_id: ID of the announcement to delete
        
    Returns:
        True if the announcement was found and deleted, False otherwise
    """
    anmt = db.query(models.Announcement).filter(models.Announcement.announcement_id == announcement_id).first()
    if not anmt:
        return False
    
    db.delete(anmt)
    db.commit()
    return True


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


# ───────────── requests ─────────────
def create_request(db: Session, payload: schemas.RequestCreate) -> models.Request:
    """
    Create a new request for a user to join a group, only if no active requests exist.
    
    Args:
        db: Database session
        payload: RequestCreate object containing user_id and group_id
        
    Returns:
        The created Request object
    """
    # Check if a request already exists for this user and group
    existing_request = db.query(models.Request).filter(
        models.Request.user_id == payload.user_id,
        models.Request.group_id == payload.group_id,
        models.Request.resolved == False
    ).first()
    if existing_request:
        raise HTTPException(status_code=400, detail="You already have an active request for this group")
    
    # Generate a request_id by counting existing requests
    request_count = db.query(models.Request).count()
    request_id = f"REQ-{request_count + 1}"
    
    # Create the request object
    db_request = models.Request(
        request_id=request_id,
        group_id=payload.group_id,
        user_id=payload.user_id,
        resolved=False
    )
    
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    
    return db_request


def resolve_request(db: Session, payload: schemas.RequestResolve) -> Optional[models.Request]:
    """
    Resolve a request by updating its status and, if accepted, creating a group membership.
    
    Args:
        db: Database session
        payload: RequestResolve object containing request_id, accepted, and resolver_user_id
        
    Returns:
        The updated Request object if found, None otherwise
    """
    # Get the request
    request = db.query(models.Request).filter(models.Request.request_id == payload.request_id).first()
    if not request:
        return None
    
    # Get resolver's CF handle
    resolver = db.query(models.User).filter(models.User.user_id == payload.resolver_user_id).first()
    resolver_cf_handle = resolver.cf_handle if resolver else None
    
    # Update request fields
    request.resolved = True
    request.accepted = payload.accepted
    request.resolve_timestamp = datetime.utcnow()
    request.resolver_user_id = payload.resolver_user_id
    request.resolver_cf_handle = resolver_cf_handle
    
    # If request is accepted, create a group membership
    if payload.accepted:
        # Create a membership for the user in the group
        membership_payload = schemas.GroupMembershipAdd(
            user_id=request.user_id,
            group_id=request.group_id,
            role=models.Role.user
        )
        add_membership(db, membership_payload)
    
    db.commit()
    db.refresh(request)
    
    return request


def count_requests(
    db: Session,
    group_id: Optional[str] = None,
    user_id: Optional[str] = None,
    resolved: Optional[bool] = None,
    accepted: Optional[bool] = None,
    resolver_user_id: Optional[str] = None,
    resolver_cf_handle: Optional[str] = None,
) -> int:
    """
    Count requests based on the provided filters.
    
    Args:
        db: Database session
        group_id: Optional filter by group ID
        user_id: Optional filter by user ID
        resolved: Optional filter by resolved status
        accepted: Optional filter by accepted status
        resolver_user_id: Optional filter by resolver user ID
        resolver_cf_handle: Optional filter by resolver CF handle
        
    Returns:
        Count of requests matching all the provided filters
    """
    query = db.query(models.Request)
    
    # Apply filters if provided (all columns are indexed for O(log n) lookup)
    if group_id is not None:
        query = query.filter(models.Request.group_id == group_id)
    
    if user_id is not None:
        query = query.filter(models.Request.user_id == user_id)
    
    if resolved is not None:
        query = query.filter(models.Request.resolved == resolved)
    
    if accepted is not None:
        query = query.filter(models.Request.accepted == accepted)
    
    if resolver_user_id is not None:
        query = query.filter(models.Request.resolver_user_id == resolver_user_id)
    
    if resolver_cf_handle is not None:
        query = query.filter(models.Request.resolver_cf_handle == resolver_cf_handle)
    
    return query.count()

def get_request(db: Session, request_id: str) -> Optional[models.Request]:
    return db.query(models.Request).filter(models.Request.request_id == request_id).first()

def get_requests_range_fetch(
    db: Session,
    group_id: Optional[str] = None,
    user_id: Optional[str] = None,
    resolver_user_id: Optional[str] = None,
    resolved: Optional[bool] = None,
    accepted: Optional[bool] = None,
    sort_by: schemas.RequestSortByField = schemas.RequestSortByField.TIMESTAMP,
    sort_order: schemas.SortOrder = schemas.SortOrder.DESC,
    skip: int = 0,
    limit: int = 25,
) -> Dict[str, Any]:
    """
    Get a paginated list of requests with filters and sorting options.
    
    Args:
        db: Database session
        group_id: Optional filter by group ID
        user_id: Optional filter by user ID
        resolver_user_id: Optional filter by resolver user ID
        resolved: Optional filter by resolved status
        accepted: Optional filter by accepted status
        sort_by: Field to sort by
        sort_order: Sort order (asc/desc)
        skip: Number of records to skip (pagination offset)
        limit: Maximum number of records to return
        
    Returns:
        Dictionary with 'items' (list of requests) and 'total' (total count)
    """
    # Base query
    query = db.query(models.Request)
    
    # Apply filters if provided
    if group_id is not None:
        query = query.filter(models.Request.group_id == group_id)
    
    if user_id is not None:
        query = query.filter(models.Request.user_id == user_id)
    
    if resolver_user_id is not None:
        query = query.filter(models.Request.resolver_user_id == resolver_user_id)
    
    if resolved is not None:
        query = query.filter(models.Request.resolved == resolved)
    
    if accepted is not None:
        query = query.filter(models.Request.accepted == accepted)
    
    # Get total count for pagination info
    total = query.count()
    
    # Apply sorting
    sort_column = getattr(models.Request, sort_by.value)
    if sort_order == schemas.SortOrder.DESC:
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))
    
    # Apply pagination
    requests = query.offset(skip).limit(limit).all()
    
    return {
        "items": requests,
        "total": total
    }

