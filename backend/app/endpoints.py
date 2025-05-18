from datetime import datetime, timedelta
import os
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app import crud, database, models, schemas
from typing import List, Optional

router = APIRouter(prefix="/api")

# ---------- auth boilerplate ----------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/user/login")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 998_244_353  # memes stay

role_rank = {"admin": 3, "moderator": 2, "user": 1}  # simpler than enums


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


# ---------- user endpoints ----------
@router.post("/user/register", response_model=schemas.UserOut)
def register_user(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    if crud.get_user(db, payload.user_id):
        raise HTTPException(400, "user already exists")
    return crud.create_user(db, payload)

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
    
    return user


@router.put("/user", response_model=schemas.UserOut)
def update_user(
    user_id: str = Query(...),
    payload: schemas.UserUpdate = Depends(),
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
        raise HTTPException(400, "provide at least one of gid, uid, or cid")
    return crud.filter_contest_participations(db, gid, uid, cid)

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
    return crud.create_report(db, payload)


@router.get("/report", response_model=List[schemas.ReportOut])
def list_reports(
    group_id: Optional[str] = Query(None),
    unresolved_only: bool = Query(False),
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    if group_id and current.role == models.Role.user:
        if not crud.get_membership(db, current.user_id, group_id):
            raise HTTPException(403, "insufficient privilege")
    return crud.list_reports(db, group_id, unresolved_only)


@router.put("/report/resolve", response_model=schemas.ReportOut)
def resolve_report(
    payload: schemas.ReportResolve,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    rpt = db.query(models.Report).filter(models.Report.report_id == payload.report_id).first()
    if not rpt:
        raise HTTPException(404, "report not found")
    ensure_group_mod(db, current.user_id, rpt.group_id)
    return crud.resolve_report(db, payload)

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
    if group_id and current.role == models.Role.user:
        if not crud.get_membership(db, current.user_id, group_id):
            raise HTTPException(403, "insufficient privilege")
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
