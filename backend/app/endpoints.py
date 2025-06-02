from datetime import datetime, timedelta
import os
from typing import List, Optional
import sys
import os

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import crud, database, models, schemas
from typing import List, Optional
from typing import Union

router = APIRouter(prefix="/api")

# ---------- auth boilerplate ----------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/user/login")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 998_244_353  # memes stay

role_rank = {"admin": 3, "moderator": 2, "user": 1, "kicked": -1}  # simpler than enums


def get_db():
    db = next(database.get_db())
    try:
        yield db
    finally:
        db.close()


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="unauthorized"
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid: str | None = payload.get("sub")
        if not uid:
            raise credentials_error
    except JWTError:
        raise credentials_error

    user = crud.get_user(db, uid)
    if not user:
        raise credentials_error
    return user


def assert_global_privilege(user: models.User, minimum: str):
    if role_rank[user.role] < role_rank[minimum]:
        raise HTTPException(status_code=403, detail="insufficient privilege")


def assert_group_privilege(
    db: Session,
    requester: models.User,
    target_uid: str,
    group_id: str,
):
    """
    requester must outrank target inside the same group.
    """
    r_mem = crud.get_membership(db, requester.user_id, group_id)
    t_mem = crud.get_membership(db, target_uid, group_id)
    if not (r_mem and t_mem):
        raise HTTPException(status_code=404, detail="membership not found")

    if role_rank[r_mem.role] <= role_rank[t_mem.role]:
        raise HTTPException(status_code=403, detail="insufficient privilege")

# helper (stick near the other helpers)
def ensure_group_mod(db: Session, uid: str, gid: str):
    m = crud.get_membership(db, uid, gid)
    if not m or role_rank[m.role] < role_rank["moderator"]:
        raise HTTPException(403, "insufficient privilege")
        
# helper to check if a user has sufficient privileges to modify roles in a group
def check_role_modification_privileges(db: Session, requester_id: str, target_id: str, group_id: str, new_role: str):
    """Check if a user has sufficient privileges to modify another user's role in a group.
    
    Args:
        db: Database session
        requester_id: ID of the user making the request
        target_id: ID of the user whose role is being modified
        group_id: ID of the group
        new_role: The new role to be assigned
        
    Raises:
        HTTPException: If the requester doesn't have sufficient privileges or membership doesn't exist
    """
    # Get memberships
    requester_membership = crud.get_membership(db, requester_id, group_id)
    target_membership = crud.get_membership(db, target_id, group_id)
    
    # Check if memberships exist
    if not requester_membership:
        raise HTTPException(status_code=403, detail="You are not a member of this group")
    if not target_membership:
        raise HTTPException(status_code=404, detail="Target user is not a member of this group")
    
    requester_role_rank = role_rank[requester_membership.role]
    target_role_rank = role_rank[target_membership.role]
    new_role_rank = role_rank[new_role]
    
    # Check if requester is either strictly greater in role than the target OR is an admin
    if not (requester_role_rank > target_role_rank or requester_membership.role == "admin"):
        raise HTTPException(status_code=403, detail="Insufficient privilege to modify this user's role")
    
    # Check if new role is not greater than requester's role
    if new_role_rank > requester_role_rank:
        raise HTTPException(status_code=403, detail="Cannot assign a role higher than your own role")

# helper to check if a user has sufficient privileges to remove another user from a group
def check_removal_privileges(db: Session, requester_id: str, target_id: str, group_id: str):
    """Check if a user has sufficient privileges to remove another user from a group.
    
    Args:
        db: Database session
        requester_id: ID of the user making the request
        target_id: ID of the user being removed
        group_id: ID of the group
        
    Raises:
        HTTPException: If the requester doesn't have sufficient privileges or membership doesn't exist
    """
    # Get memberships
    requester_membership = crud.get_membership(db, requester_id, group_id)
    target_membership = crud.get_membership(db, target_id, group_id)
    
    # Check if memberships exist
    if not requester_membership:
        raise HTTPException(status_code=403, detail="You are not a member of this group")
    if not target_membership:
        raise HTTPException(status_code=404, detail="Target user is not a member of this group")
    
    requester_role_rank = role_rank[requester_membership.role]
    target_role_rank = role_rank[target_membership.role]
    
    # Check if requester is either strictly greater in role than the target OR is an admin
    if not (requester_role_rank > target_role_rank or requester_membership.role == "admin"):
        raise HTTPException(status_code=403, detail="Insufficient privilege to remove this user from the group")



# ---------- user endpoints ----------
@router.post("/user/register", response_model=schemas.UserOut)
def register_user(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    # Set user_id = cf_handle
    cf_handle = payload.cf_handle.strip()
    user_id = cf_handle

    # Check if user with this cf_handle already exists (as user_id or cf_handle)
    if crud.get_user(db, user_id) or crud.get_user_by_handle(db, cf_handle):
        raise HTTPException(400, "A user with this Codeforces handle already exists.")

    # Fetch recent submissions from Codeforces API
    import requests
    try:
        resp = requests.get(
            f"https://codeforces.com/api/user.status?handle={cf_handle}&from=1&count=10"
        )
        resp.raise_for_status()
        data = resp.json()
        if data['status'] != 'OK':
            raise Exception("CF API error")
        submissions = data['result']
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch submissions from Codeforces: {str(e)}")

    # Only check the latest submission
    if not submissions:
        raise HTTPException(400, "No submissions found for this user.")
    latest = submissions[0]
    prob = latest.get('problem', {})
    if str(prob.get('contestId')) != '1188' or prob.get('index') != 'B':
        raise HTTPException(400, "Your latest submission is not to problem 1188/B.")
    if latest.get('verdict') != 'COMPILATION_ERROR':
        raise HTTPException(400, "Your latest submission to 1188/B is not a COMPILATION_ERROR.")
    # Check time (must be <5 minutes ago)
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).timestamp()
    sub_time = latest.get('creationTimeSeconds')
    if sub_time is None:
        raise HTTPException(400, "Could not determine submission time.")
    if now - sub_time > 5 * 60:
        raise HTTPException(400, "Your latest submission to 1188/B is older than 5 minutes.")

    # All checks passed, create user
    user_payload = schemas.UserRegister(
        user_id=user_id,
        cf_handle=cf_handle,
        email_id=payload.email_id,
        password=payload.password,
        role=payload.role
    )
    return crud.create_user(db, user_payload)

@router.post("/user/login", response_model=schemas.TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, form.username, form.password)
    if not user:
        raise HTTPException(401, "invalid credentials")
    token = create_access_token({"sub": user.user_id})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/user", response_model=schemas.UserOut)
def get_user(
    user_id: str = Query(..., description="User ID to retrieve"),
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    # Return email only if the user is querying their own profile
    if user_id != current.user_id:
        user.email_id = None

    # print(f"DEBUG: Endpoint /user: Fetched user {user.user_id}, role from DB: {user.role}") # DEBUG
    return user


@router.put("/user", response_model=schemas.UserOut)
def update_user(
    payload: schemas.UserUpdate,
    user_id: str = Query(...),
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    if user_id != current.user_id:
        assert_global_privilege(current, "moderator")
    updated = crud.update_user(db, user_id, payload)
    if not updated:
        raise HTTPException(404, "user not found")
    return updated

# ---------- group endpoints ----------
@router.post("/group/register", response_model=schemas.GroupOut)
def register_group(
    payload: schemas.GroupRegister,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):  
    # anyone can register a group
    assert_global_privilege(current, "user")
    if crud.get_group(db, payload.group_id):
        raise HTTPException(400, "group already exists")
    return crud.create_group(db, payload)

@router.get("/groups", response_model=List[schemas.GroupOut])
def get_groups(
    # is_private: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    groups_with_counts = crud.list_groups(db)
    result = []
    for group, count in groups_with_counts:
        # Convert SQLAlchemy model to dict and explicitly add member_count
        group_dict = {
            "group_id": group.group_id,
            "group_name": group.group_name,
            "group_description": group.group_description,
            "is_private": group.is_private,
            "timestamp": group.timestamp,
            "member_count": count
        }
        # Create Pydantic model from dict
        result.append(schemas.GroupOut(**group_dict))
    return result



@router.get("/group", response_model=schemas.GroupSingle)
def get_single_group(
    group_id: str = Query(..., description="Group ID to retrieve"),
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    """
    Get a single group by its ID.
    
    Args:
        group_id: ID of the group to retrieve
        db: Database session
        current: Current authenticated user
        
    Returns:
        Group object with all its attributes
    
    Raises:
        HTTPException: If group not found
    """
    group = crud.get_group(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


@router.put("/group", response_model=schemas.GroupOut)
def update_group(
    payload: schemas.GroupUpdate,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    grp = crud.get_group(db, payload.group_id)
    if not grp:
        raise HTTPException(404, "group not found")

    # requester must be at least moderator inside that group
    g_mem = crud.get_membership(db, current.user_id, payload.group_id)
    if not g_mem or role_rank[g_mem.role] < role_rank["moderator"]:
        raise HTTPException(403, "insufficient privilege")

    return crud.update_group(db, payload)


@router.post("/add_to_group", response_model=schemas.GroupMembershipOut)
def add_to_group(
    payload: schemas.GroupMembershipAdd,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    # cannot add someone with role >= your own
    assert_group_privilege(db, current, payload.user_id, payload.group_id)
    return crud.add_membership(db, payload)


@router.post("/remove_from_group")
def remove_from_group(
    payload: schemas.GroupMembershipRemove,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    assert_group_privilege(db, current, payload.user_id, payload.group_id)
    success = crud.remove_membership(db, payload.user_id, payload.group_id)
    if not success:
        raise HTTPException(404, "membership not found")
    return {"detail": "membership removed"}


# ---------- contest ----------
@router.post("/register_rated")
def register_rated(
    payload: schemas.ContestRegistration,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    if payload.user_id != current.user_id:
        assert_global_privilege(current, "moderator")
    participation = crud.register_contest_participation(db, payload)
    return {"detail": "participation recorded", "participation_id": participation.contest_id}

# ---------- contest look-up ----------
@router.get("/contest_participations", response_model=List[schemas.ContestParticipationOut])
def get_contest_participations(
    gid: Optional[str] = Query(None, description="group id"),
    uid: Optional[str] = Query(None, description="user id"),
    cid: Optional[str] = Query(None, description="contest id"),
    db: Session = Depends(database.get_db),
):
    if gid is None and uid is None and cid is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="provide at least one of gid, uid, or cid")
    return crud.filter_contest_participations(db, gid=gid, uid=uid, cid=cid)


@router.get("/contest_participations_size", response_model=schemas.CountResponse)
def get_contest_participations_size(
    gid: Optional[str] = Query(None, description="Filter by group ID"),
    uid: Optional[str] = Query(None, description="Filter by user ID"),
    cid: Optional[str] = Query(None, description="Filter by contest ID"),
    db: Session = Depends(get_db),
    # current_user: models.User = Depends(get_current_user), # Add if auth is needed
):
    """
    Get the count of contest participations based on optional filters.
    At least one filter (gid, uid, or cid) must be provided.
    """
    if gid is None and uid is None and cid is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one of gid, uid, or cid"
        )
    
    count = crud.count_contest_participations(db, group_id=gid, user_id=uid, contest_id=cid)
    return schemas.CountResponse(count=count)


@router.get("/contest_participations_range_fetch", response_model=schemas.ContestParticipationRangeFetchResponse)
def get_contest_participations_range_fetch(
    gid: Optional[str] = Query(None, description="Filter by group ID"),
    uid: Optional[str] = Query(None, description="Filter by user ID"),
    cid: Optional[str] = Query(None, description="Filter by contest ID"),
    sort_by: schemas.ContestParticipationSortByField = Query(
        schemas.ContestParticipationSortByField.RATING_AFTER, 
        description="Field to sort by"
    ),
    sort_dir: schemas.SortOrder = Query(
        schemas.SortOrder.DESC, 
        description="Sort direction (asc or desc)"
    ),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(25, ge=1, le=100, description="Maximum number of records to return"), # Max limit 100
    db: Session = Depends(database.get_db),
):
    if gid is None and uid is None and cid is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Provide at least one of gid, uid, or cid as a filter."
        )
    
    result = crud.get_contest_participations_range_fetch(
        db=db,
        gid=gid,
        uid=uid,
        cid=cid,
        sort_by=sort_by,
        sort_dir=sort_dir,
        offset=offset,
        limit=limit,
    )
    return schemas.ContestParticipationRangeFetchResponse(items=result['items'], total=result['total'])


@router.get("/contests", response_model=List[schemas.ContestOut])
def list_contests(
    finished: Optional[bool] = Query(None, description="Filter contests by finished status"),
    db: Session = Depends(database.get_db),
    current: models.User = Depends(get_current_user),
):
    """
    Get all contests, optionally filtered by their finished status.
    
    Args:
        finished: Optional boolean to filter by finished status
        db: Database session
        current: Current authenticated user
        
    Returns:
        List of Contest objects
    """
    return crud.list_contests(db, finished)

@router.get("/contest", response_model=schemas.ContestOut)
def get_contest(
    contest_id: str = Query(..., description="Contest ID"),
    db: Session = Depends(database.get_db),
    current: models.User = Depends(get_current_user),
):
    """
    Get a single contest by its ID.
    
    Args:
        contest_id: ID of the contest to retrieve
        db: Database session
        current: Current authenticated user
        
    Returns:
        Contest object
    
    Raises:
        HTTPException: If contest not found
    """
    contest = crud.get_contest(db, contest_id)
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    return contest

# ========== report routes ==========

@router.post("/report", response_model=schemas.ReportOut)
def create_report(
    payload: schemas.ReportCreate,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    # any member of the group can file
    
    if not crud.get_membership(db, current.user_id, payload.group_id):
        raise HTTPException(403, "not a member of that group")
    
    # Generate report_id in O(1) time
    
    return crud.create_report(db, payload)

@router.get("/report", response_model=List[schemas.ReportOut])
def get_reports(
    report_id: Optional[str] = Query(None, description="Filter by report ID"),
    group_id: Optional[str] = Query(None, description="Filter by group ID"),
    contest_id: Optional[str] = Query(None, description="Filter by contest ID"),
    reporter_cf_handle: Optional[str] = Query(None, description="Filter by reporter's CF handle"),
    respondent_cf_handle: Optional[str] = Query(None, description="Filter by respondent's CF handle"),
    respondent_role_after: Optional[schemas.Role] = Query(None, description="Filter by respondent role after resolution"),
    resolved: Optional[bool] = Query(None, description="Filter by resolved status"),
    resolver_cf_handle: Optional[str] = Query(None, description="Filter by resolver user ID"),
    accepted: Optional[bool] = Query(None, description="Filter by accepted status"),
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    """
    Get a list of reports with optional filters.
    
    All filter parameters are optional. If none are provided, all reports will be returned.
    """
    # Check permissions if filtering by group_id and user is not an admin or moderator
    if group_id and current.role == models.Role.user:
        if not crud.get_membership(db, current.user_id, group_id):
            raise HTTPException(403, "insufficient privilege")
    
    # Retrieve reports based on the provided filters
    reports = crud.list_reports(
        db=db,
        report_id=report_id,
        group_id=group_id,
        contest_id=contest_id,
        reporter_cf_handle=reporter_cf_handle,
        respondent_cf_handle=respondent_cf_handle,
        respondent_role_after=respondent_role_after,
        resolved=resolved,
        resolver_cf_handle=resolver_cf_handle,
        accepted=accepted,
    )
    
    return reports


@router.get("/report_size", response_model=schemas.CountResponse)
def get_report_size(
    report_id: Optional[str] = Query(None, description="Filter by report ID"),
    group_id: Optional[str] = Query(None, description="Filter by group ID"),
    contest_id: Optional[str] = Query(None, description="Filter by contest ID"),
    reporter_cf_handle: Optional[str] = Query(None, description="Filter by reporter's CF handle"),
    respondent_cf_handle: Optional[str] = Query(None, description="Filter by respondent's CF handle"),
    respondent_role_after: Optional[schemas.Role] = Query(None, description="Filter by respondent role after resolution"),
    resolved: Optional[bool] = Query(None, description="Filter by resolved status"),
    resolver_cf_handle: Optional[str] = Query(None, description="Filter by resolver's CF handle"),
    accepted: Optional[bool] = Query(None, description="Filter by accepted status"),
    db: Session = Depends(database.get_db),
) -> schemas.CountResponse:
    """
    Get the count of reports with optional filters.
    
    All filter parameters are optional. If none are provided, all reports will be counted.
    Filters:
    - report_id: Filter by report ID
    - group_id: Filter by group ID
    - contest_id: Filter by contest ID
    - reporter_cf_handle: Filter by reporter's CF handle
    - respondent_cf_handle: Filter by respondent's CF handle
    - resolved: Filter by resolved status
    - resolver_cf_handle: Filter by resolver's CF handle
    - accepted: Filter by accepted status
    """
    # No specific privilege check for just getting a count, 
    # as no sensitive data is returned.
    # If specific groups' report counts were sensitive, 
    # auth and checks would be needed.

    count = crud.count_reports(
        db=db,
        report_id=report_id,
        group_id=group_id,
        contest_id=contest_id,
        reporter_cf_handle=reporter_cf_handle,
        respondent_cf_handle=respondent_cf_handle,
        respondent_role_after=respondent_role_after,
        resolved=resolved,
        resolver_cf_handle=resolver_cf_handle,
        accepted=accepted,
    )
    return schemas.CountResponse(count=count)


@router.put("/report/resolve", response_model=schemas.ReportOut)
def resolve_report(
    payload: schemas.ReportResolve,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    rpt = db.query(models.Report).filter(models.Report.report_id == payload.report_id).first()
    if not rpt:
        raise HTTPException(404, "report not found")

    # Auth: current user must be the resolver
    if current.user_id != payload.resolver_user_id:
        raise HTTPException(403, "You are not the resolver for this report.")

    # Fetch reporter and respondent roles (after resolution, as provided in payload)
    reporter_role = payload.reporter_role_after
    respondent_role = payload.respondent_role_after

    reporter_membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.user_id == rpt.reporter_user_id,
        models.GroupMembership.group_id == rpt.group_id,
    ).first()
    respondent_membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.user_id == rpt.respondent_user_id,
        models.GroupMembership.group_id == rpt.group_id,
    ).first()
    resolver_membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.user_id == payload.resolver_user_id,
        models.GroupMembership.group_id == rpt.group_id,
    ).first()
    
    current_role_value = role_rank.get(str(resolver_membership.role.value), 0)
    reporter_role_value = role_rank.get(str(reporter_membership.role.value), 0)
    respondent_role_value = role_rank.get(str(respondent_membership.role.value), 0)
    moderator_value = role_rank["moderator"]
    max_required = max(reporter_role_value, respondent_role_value, moderator_value)

    if current_role_value < max_required:
        raise HTTPException(403, f"Insufficient role to resolve this report. Current role: {current_role_value}, required role: {max_required}")

    return crud.resolve_report(db, payload)


@router.get("/report_range_fetch", response_model=schemas.ReportRangeFetchResponse)
def get_reports_range_fetch_endpoint(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    group_id: Optional[str] = Query(None, description="Filter by group ID"),
    contest_id: Optional[str] = Query(None, description="Filter by contest ID"),
    reporter_cf_handle: Optional[str] = Query(None, description="Filter by reporter's CF handle"),
    respondent_cf_handle: Optional[str] = Query(None, description="Filter by respondent's CF handle"),
    respondent_role_after: Optional[schemas.Role] = Query(None, description="Filter by respondent role after resolution"),
    resolved: Optional[bool] = Query(None, description="Filter by resolved status"),
    resolver_cf_handle: Optional[str] = Query(None, description="Filter by resolver's CF handle"),
    accepted: Optional[bool] = Query(None, description="Filter by accepted status"),
    sort_by: Optional[schemas.ReportSortByField] = Query(schemas.ReportSortByField.REPORT_DATE, description="Field to sort by (including 'accepted')"),
    sort_order: Optional[schemas.SortOrder] = Query(schemas.SortOrder.DESC, description="Sort order"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(25, ge=1, le=100, description="Maximum number of records to return (max 100)"),
):
    result = crud.get_reports_range_fetch(
        db=db,
        group_id=group_id,
        contest_id=contest_id,
        reporter_cf_handle=reporter_cf_handle,
        respondent_cf_handle=respondent_cf_handle,
        respondent_role_after=respondent_role_after,
        resolved=resolved,
        resolver_cf_handle=resolver_cf_handle,
        accepted=accepted,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=skip,
        limit=limit,
    )
    return schemas.ReportRangeFetchResponse(items=result["items"], total=result["total"])


# ========== announcement routes ==========

@router.post("/announcement", response_model=schemas.AnnouncementOut)
def create_announcement(
    payload: schemas.AnnouncementCreate,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    ensure_group_mod(db, current.user_id, payload.group_id)
    return crud.create_announcement(db, payload)


@router.get("/announcement", response_model=List[schemas.AnnouncementOut])
def list_announcements(
    group_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    return crud.list_announcements(db, group_id)


@router.put("/announcement", response_model=schemas.AnnouncementOut)
def update_announcement(
    payload: schemas.AnnouncementUpdate,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    anmt = (
        db.query(models.Announcement)
        .filter(models.Announcement.announcement_id == payload.announcement_id)
        .first()
    )
    if not anmt:
        raise HTTPException(404, "announcement not found")
    ensure_group_mod(db, current.user_id, anmt.group_id)
    return crud.update_announcement(db, payload)


# ========== custom group data endpoints ==========

@router.get("/group_membership_size", response_model=schemas.CountResponse)
def get_group_membership_size(
    gid: str = Query(..., description="Group ID to retrieve member count for"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get the number of all memberships in a group (no status/user filtering).
    """
    group = crud.get_group(db, gid)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    count = crud.count_group_memberships(db, gid)
    return schemas.CountResponse(count=count)


@router.get("/group_membership_range_fetch", response_model=List[schemas.GroupMembershipOut])
def get_group_membership_range_fetch(
    gid: str = Query(..., description="Group ID to retrieve data for"),
    sort_by: schemas.GroupMemberSortByField = Query(schemas.GroupMemberSortByField.DATE_JOINED, description="Field to sort by"),
    sort_order: schemas.SortOrder = Query(schemas.SortOrder.DESC, description="Sort order (asc or desc)"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(15, ge=1, le=100, description="Number of items per page (max 100)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get paginated and sorted memberships for a group (no status/user filtering).
    """
    group = crud.get_group(db, gid)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    memberships = crud.get_group_memberships_paginated(
        db=db,
        group_id=gid,
        sort_by=sort_by,
        sort_order=sort_order,
        offset=offset,
        limit=limit
    )
    return memberships



@router.get("/group_members_custom_data", response_model=List[schemas.CustomMembershipData])
def get_group_members_custom_data(
    group_id: str = Query(..., description="Group ID to retrieve custom data for"),
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    """
    Get custom membership data for all members in a group including number of rated contests.
    
    Args:
        group_id: ID of the group
        db: Database session
        current: Current authenticated user
        
    Returns:
        List of CustomMembershipData objects with enriched contest participation info
    
    Raises:
        HTTPException: If group not found or user has insufficient privileges
    """
    # Check if the group exists
    group = crud.get_group(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Get the custom membership data
    return crud.get_group_custom_membership_data(db, group_id)


@router.get("/group_members_custom_data_size", response_model=schemas.CountResponse)
def get_group_members_custom_data_size(
    group_id: str = Query(..., description="Group ID to retrieve member count for"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get the number of members in a group for whom custom data would be returned.
    This count is based on active memberships linked to existing users.
    
    Args:
        group_id: ID of the group
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        CountResponse object containing the number of members
    
    Raises:
        HTTPException: If group not found or user has insufficient privileges
    """
    # Check if the group exists
    group = crud.get_group(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Get the count of members with custom data
    count = crud.count_group_members_with_custom_data(db, group_id)
    return schemas.CountResponse(count=count)


@router.get("/group_members_custom_data_range_fetch", response_model=List[schemas.CustomMembershipData])
def get_group_members_custom_data_range_fetch(
    group_id: str = Query(..., description="Group ID to retrieve data for"),
    sort_by: schemas.GroupMemberSortByField = Query(schemas.GroupMemberSortByField.DATE_JOINED, description="Field to sort by"),
    sort_order: schemas.SortOrder = Query(schemas.SortOrder.DESC, description="Sort order (asc or desc)"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(15, ge=1, le=100, description="Number of items per page (max 100)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get paginated and sorted custom membership data for a group.
    The 'number_of_rated_contests' field has been removed from the response.
    """
    # Authorization checks
    group = crud.get_group(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if current_user.role != models.Role.admin and not crud.get_membership(db, current_user.user_id, group_id):
        raise HTTPException(status_code=403, detail="Not authorized to access this group's data")

    return crud.get_group_custom_membership_data_paginated(
        db=db,
        group_id=group_id,
        sort_by=sort_by,
        sort_order=sort_order,
        offset=offset,
        limit=limit
    )

# ========== extension query endpoints ==========

@router.post("/extension_query_1", response_model=schemas.ExtensionQuery1Response)
def extension_query_1(
    payload: schemas.ExtensionQuery1Request,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    """
    Get user_group_ratings for a list of cf_handles in a specific group.
    
    Args:
        payload: Request containing group_id and list of cf_handles
        db: Database session
        current: Current authenticated user
        
    Returns:
        List of ratings corresponding to each cf_handle
    """
    # Check if the group exists
    group = crud.get_group(db, payload.group_id)
    if not group:
        raise HTTPException(404, "Group not found")
        
    # Get ratings for the cf_handles
    ratings = crud.get_ratings_by_cf_handles(db, payload.group_id, payload.cf_handles)
    
    return {"ratings": ratings}


# ========== membership query endpoint ==========

@router.get("/membership", response_model=schemas.GroupMembershipOut)
def check_membership(
    group_id: str = Query(..., description="Group ID to check membership for"),
    user_id: str = Query(..., description="User ID to check membership for"),
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    """
    Check if a user is a member of a specific group.
    
    Args:
        group_id: ID of the group to check membership for
        user_id: ID of the user to check membership for
        db: Database session
        current: Current authenticated user
        
    Returns:
        Membership details if user is a member, otherwise 404
    
    Raises:
        HTTPException: If membership not found
    """
    # First check if current user has permission to view membership info
    # Only allow if current user is admin, group mod/admin, or checking their own membership
    if current.role != models.Role.admin and current.user_id != user_id:
        # Check if current user is a moderator or admin in the group
        current_membership = crud.get_membership(db, current.user_id, group_id)
        if not current_membership or role_rank[current_membership.role] < role_rank["moderator"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions to view membership")
    
    # Check if user is a member of the group
    membership = crud.get_membership(db, user_id, group_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    
    return membership


@router.get("/get_request", response_model=schemas.RequestOut)
def get_request_endpoint(
    request_id: str = Query(..., description="Request ID to retrieve"),
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    """
    Get a specific request by its request_id.
    
    Args:
        request_id: ID of the request to retrieve
        db: Database session
        current: Current authenticated user
        
    Returns:
        The request with the specified ID
        
    Raises:
        HTTPException: If the request is not found
    """
    request = crud.get_request(db, request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )
    
    return request

# ---------------------- admin routes ----------------------

@router.post("/admin/update-finished-contests", status_code=status.HTTP_200_OK)
def update_finished_contests_endpoint(
    cutoff_days: Optional[int] = Query(None, description="Number of days to look back for finished contests"),
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    """
    Admin endpoint to update finished contests from Codeforces.
    
    Args:
        cutoff_days: Optional number of days to look back for finished contests
        db: Database session
        current: Current authenticated user
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If user does not have admin privileges
    """
    # Check if user has admin privileges
    assert_global_privilege(current, "admin")
    
    # Update finished contests
    crud.update_finished_contests(db, cutoff_days)
    
    return {"message": "Finished contests updated successfully"}


@router.post("/admin/update-upcoming-contests", status_code=status.HTTP_200_OK)
def update_upcoming_contests_endpoint(
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    """
    Admin endpoint to update upcoming contests from Codeforces.
    
    Args:
        db: Database session
        current: Current authenticated user
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If user does not have admin privileges
    """
    # Check if user has admin privileges
    assert_global_privilege(current, "admin")
    
    # Update upcoming contests
    crud.update_upcoming_contests(db)
    
    return {"message": "Upcoming contests updated successfully"}


@router.post("/dev/seed", status_code=status.HTTP_200_OK)
def run_seed():
    """
    Development endpoint to reset and seed the database with test data.
    This endpoint has NO authentication restrictions and should only be used in development.
    
    Returns:
        Success message
    """
    # Import seed function from parent directory
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from devseed import seed
    
    # Run the seed function
    seed()
    
    return {"message": "Database has been reset and seeded with test data"}

@router.post("/devseed2", status_code=status.HTTP_200_OK)
def run_seed2():
    """
    Development endpoint to run devseed2.py and seed the database with alternate test data.
    This endpoint has NO authentication restrictions and should only be used in development.

    Returns:
        Success message
    """
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from devseed2 import seed
    seed()
    return {"message": "Database has been seeded with devseed2 data"}


# ------------------------- custom routes --------------------

# ---------- group membership removal ----------
@router.post("/remove_user_from_group", status_code=status.HTTP_200_OK)
def remove_user_from_group(
    payload: schemas.GroupMembershipRemove,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    """
    Delete a group membership object, removing a user from a group.
    
    Args:
        payload: GroupMembershipRemove object containing user_id and group_id
        db: Database session
        current: Current authenticated user
    
    Returns:
        Success message
    
    Raises:
        HTTPException: If the user doesn't have sufficient privileges or the membership doesn't exist
    """
    # Check permissions based on the requirements
    check_removal_privileges(
        db=db,
        requester_id=current.user_id,
        target_id=payload.user_id,
        group_id=payload.group_id
    )
    
    # Remove the membership
    success = crud.remove_membership(
        db=db,
        user_id=payload.user_id,
        group_id=payload.group_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found"
        )
    
    return {"detail": "User successfully removed from group"}

@router.put("/change_membership_status", response_model=schemas.GroupMembershipOut)
def change_membership_role(
    payload: schemas.GroupMembershipRoleUpdate,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    """
    Modify the role attribute of a group membership object.
    
    Args:
        payload: GroupMembershipRoleUpdate object containing user_id, group_id, and new_role
        db: Database session
        current: Current authenticated user
    
    Returns:
        Updated GroupMembershipOut object
    
    Raises:
        HTTPException: If the user doesn't have sufficient privileges or the membership doesn't exist
    """

    
    # Check permissions based on the requirements
    check_role_modification_privileges(
        db=db,
        requester_id=current.user_id,
        target_id=payload.user_id,
        group_id=payload.group_id,
        new_role=payload.new_role
    )

    if payload.new_role == "kicked":
        # Get the membership before removing it so we can return its data
        membership = crud.get_membership(
            db=db,
            user_id=payload.user_id,
            group_id=payload.group_id
        )
        
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Membership not found"
            )
            
        # Create a response object with the membership data before removing it
        response = schemas.GroupMembershipOut(
            user_id=membership.user_id,
            group_id=membership.group_id,
            role="kicked",  # We're using "kicked" as the role in response
            user_group_rating=membership.user_group_rating,
            user_group_max_rating=membership.user_group_max_rating,
            cf_handle=membership.cf_handle,
            timestamp=membership.timestamp
        )
        
        # Now remove the membership
        crud.remove_membership(
            db=db,
            user_id=payload.user_id,
            group_id=payload.group_id
        )
        
        return response
    
    # Update the membership role
    updated_membership = crud.update_membership_role(
        db=db,
        user_id=payload.user_id,
        group_id=payload.group_id,
        new_role=payload.new_role
    )
    
    if not updated_membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found"
        )
    
    return updated_membership

@router.post("/contest/register", response_model=schemas.ContestParticipationOut)
def register_contest_participation_endpoint(
    payload: schemas.ContestRegistration,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    """
    Register a user for a contest within a group.
    
    Args:
        payload: ContestRegistration object containing user_id, group_id, and contest_id
        db: Database session
        current: Current authenticated user
        
    Returns:
        Created ContestParticipation object
        
    Raises:
        HTTPException: If validation fails or there's a duplicate entry
    """
    # Verify the current user is the same as the one being registered
    if current.user_id != payload.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only register yourself for contests"
        )
    
    # Check if user exists
    user = crud.get_user(db, payload.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if group exists
    group = crud.get_group(db, payload.group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check if contest exists
    contest = crud.get_contest(db, payload.contest_id)
    if not contest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contest not found"
        )

    if contest.finished:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contest is finished"
        )
    
    # Check if group membership exists
    membership = crud.get_membership(db, payload.user_id, payload.group_id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of the group to register for a contest"
        )
    
    # Check for duplicates
    existing_participation = db.query(models.ContestParticipation).filter(
        models.ContestParticipation.user_id == payload.user_id,
        models.ContestParticipation.group_id == payload.group_id,
        models.ContestParticipation.contest_id == payload.contest_id
    ).first()
    
    if existing_participation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already registered for this contest in this group"
        )
    
    # Create the contest participation
    return crud.register_contest_participation(db, payload)

@router.post("/contest/deregister", status_code=status.HTTP_200_OK)
def deregister_contest_participation_endpoint(
    payload: schemas.ContestRegistration,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    """
    Deregister a user from a contest within a group.
    
    Args:
        payload: ContestRegistration object containing user_id, group_id, and contest_id
        db: Database session
        current: Current authenticated user
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If validation fails or the contest participation doesn't exist
    """
    # Verify the current user is the same as the one being deregistered
    if current.user_id != payload.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only deregister yourself from contests"
        )
    
    # Attempt to delete the contest participation
    success = crud.deregister_contest_participation(
        db=db,
        user_id=payload.user_id,
        group_id=payload.group_id,
        contest_id=payload.contest_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contest participation not found"
        )
    
    return {"message": "Successfully deregistered from contest"}

@router.get("/contest_group_counts")
def contest_group_counts(
    contest_id: str = Query(..., description="Contest ID"),
    group_id: str = Query(..., description="Group ID"),
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    """
    Get the total members and participation counts for a specific group in a contest.
    
    Args:
        contest_id: ID of the contest
        group_id: ID of the group
        db: Database session
        current: Current authenticated user
        
    Returns:
        Dict with total_members and total_participation counts, or None if group_views is null
        
    Raises:
        HTTPException: If contest not found
    """
    # Retrieve the contest object
    contest = crud.get_contest(db, contest_id)
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    
    # Check if group_views is null
    if contest.group_views is None:
        return None
    
    # Return the group's counts from the group_views dictionary
    return contest.group_views.get(group_id)


@router.post("/join_group", response_model=Union[schemas.GroupMembershipOut, schemas.RequestOut])
def join_group(
    payload: schemas.GroupMembershipAdd,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    """
    Join a group or create a join request based on group privacy and user history.
    If group is public and user was never kicked, directly adds membership.
    If group is private or user was kicked before, creates a join request.
    
    Args:
        payload: GroupMembershipAdd object containing user_id and group_id
        db: Database session
        current: Current authenticated user
        
    Returns:
        Either the created membership or the created request
        
    Raises:
        HTTPException: If validation fails
    """
    # Verify the current user is the same as the one in the payload
    if current.user_id != payload.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only join groups for yourself"
        )
    
    # Check if group exists
    group = crud.get_group(db, payload.group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check if user already has a membership in the group
    existing_membership = crud.get_membership(db, payload.user_id, payload.group_id)
    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already a member of this group"
        )
    
    # Check if user was ever kicked from this group
    was_kicked = db.query(models.Report).filter(
        models.Report.group_id == payload.group_id,
        models.Report.respondent_user_id == payload.user_id,
        models.Report.resolved == True,
        models.Report.accepted == True  # Report was accepted = user was kicked
    ).first() is not None
    
    # If group is public and user was never kicked, directly add membership
    if not group.is_private and not was_kicked:
        return crud.add_membership(db, payload)
    
    # Otherwise create a join request
    request_payload = schemas.RequestCreate(
        user_id=payload.user_id,
        group_id=payload.group_id
    )
    return crud.create_request(db, request_payload)

@router.post("/create_request", response_model=schemas.RequestOut)
def create_request(
    payload: schemas.RequestCreate,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    """
    Create a new request for a user to join a group.
    
    Args:
        payload: RequestCreate object containing user_id and group_id
        db: Database session
        current: Current authenticated user
        
    Returns:
        The created request
        
    Raises:
        HTTPException: If validation fails
    """
    # Verify the current user is the same as the one in the payload
    if current.user_id != payload.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create requests for yourself"
        )
    
    # Check if group exists
    group = crud.get_group(db, payload.group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    if not group.is_private:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot request to join a public group"
        )
    
    # Check if user already has a membership in the group
    existing_membership = crud.get_membership(db, payload.user_id, payload.group_id)
    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already a member of this group"
        )
    
    # Check if there's already an unresolved request for this user and group
    existing_request = db.query(models.Request).filter(
        models.Request.user_id == payload.user_id,
        models.Request.group_id == payload.group_id,
        models.Request.resolved == False
    ).first()
    
    if existing_request:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a pending request for this group"
        )
    
    # Create the request
    return crud.create_request(db, payload)


@router.post("/resolve_request", response_model=schemas.RequestOut)
def resolve_request(
    payload: schemas.RequestResolve,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    """
    Resolve a request by accepting or rejecting it.
    If accepted, a group membership is created for the requesting user.
    
    Args:
        payload: RequestResolve object containing request_id, accepted, and resolver_user_id
        db: Database session
        current: Current authenticated user
        
    Returns:
        The updated request
        
    Raises:
        HTTPException: If validation fails or insufficient privileges
    """
    # Verify the current user is the same as the resolver in the payload
    if current.user_id != payload.resolver_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only resolve requests as yourself"
        )
    
    # Get the request
    request = crud.get_request(db, payload.request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )
    
    # Check if the request is already resolved
    if request.resolved:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Request is already resolved"
        )
    
    # Check if the resolver has sufficient privileges in the group (moderator or higher)
    membership = crud.get_membership(db, current.user_id, request.group_id)
    if not membership or role_rank[membership.role] < role_rank["moderator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a moderator or admin of the group to resolve requests"
        )
    
    # Resolve the request
    resolved_request = crud.resolve_request(db, payload)
    if not resolved_request:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resolve request"
        )
    
    return resolved_request


@router.get("/request_range_fetch", response_model=schemas.RequestRangeFetchResponse)
def get_requests_range_fetch_endpoint(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    group_id: Optional[str] = Query(None, description="Filter by group ID"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    resolver_user_id: Optional[str] = Query(None, description="Filter by resolver's user ID"),
    resolved: Optional[bool] = Query(None, description="Filter by resolved status"),
    accepted: Optional[bool] = Query(None, description="Filter by accepted status"),
    sort_by: Optional[schemas.RequestSortByField] = Query(schemas.RequestSortByField.TIMESTAMP, description="Field to sort by"),
    sort_order: Optional[schemas.SortOrder] = Query(schemas.SortOrder.DESC, description="Sort order"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(25, ge=1, le=100, description="Maximum number of records to return (max 100)"),
):
    """
    Get a paginated list of requests with filters and sorting options.
    
    Args:
        db: Database session
        current_user: Current authenticated user
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
        RequestRangeFetchResponse with items and total count
    """
    result = crud.get_requests_range_fetch(
        db=db,
        group_id=group_id,
        user_id=user_id,
        resolver_user_id=resolver_user_id,
        resolved=resolved,
        accepted=accepted,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=skip,
        limit=limit,
    )
    return schemas.RequestRangeFetchResponse(items=result["items"], total=result["total"])


@router.get("/requests_count", response_model=schemas.CountResponse)
def get_requests_count(
    group_id: Optional[str] = Query(None, description="Filter by group ID"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    resolved: Optional[bool] = Query(None, description="Filter by resolved status"),
    accepted: Optional[bool] = Query(None, description="Filter by accepted status"),
    resolver_user_id: Optional[str] = Query(None, description="Filter by resolver user ID"),
    resolver_cf_handle: Optional[str] = Query(None, description="Filter by resolver CF handle"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get the count of requests based on the provided filters.
    All filters are optional. If no filters are provided, returns the total count of all requests.
    
    Args:
        group_id: Optional filter by group ID
        user_id: Optional filter by user ID
        resolved: Optional filter by resolved status
        accepted: Optional filter by accepted status
        resolver_user_id: Optional filter by resolver user ID
        resolver_cf_handle: Optional filter by resolver CF handle
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        CountResponse with the count of matching requests
    """
    count = crud.count_requests(
        db=db, 
        group_id=group_id,
        user_id=user_id,
        resolved=resolved,
        accepted=accepted,
        resolver_user_id=resolver_user_id,
        resolver_cf_handle=resolver_cf_handle
    )
    return schemas.CountResponse(count=count)


@router.post("/delete_announcement", status_code=status.HTTP_200_OK)
def delete_announcement(
    payload: schemas.AnnouncementDelete,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Delete an announcement by its ID.
    
    Args:
        payload: AnnouncementDelete schema containing the announcement_id
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Success message or appropriate error
        
    Raises:
        HTTPException: If the announcement doesn't exist or the user doesn't have sufficient privileges
    """
    # Get the announcement to check the group_id
    announcement = db.query(models.Announcement).filter(
        models.Announcement.announcement_id == payload.announcement_id
    ).first()
    
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found"
        )
    
    # Check if the user is at least a moderator in the group
    membership = crud.get_membership(db, current_user.user_id, announcement.group_id)
    if not membership or membership.role not in [models.Role.moderator, models.Role.admin]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be at least a moderator in the group to delete announcements"
        )
    
    # Delete the announcement
    result = crud.delete_announcement(db, payload.announcement_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete announcement"
        )
    
    return {"message": "Announcement deleted successfully"}