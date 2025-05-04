from datetime import datetime, timedelta
import os
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app import crud, database, models, schemas

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


@router.get("/user", response_model=List[schemas.UserOut])
def list_or_get_user(
    uid: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    if uid:
        user = crud.get_user(db, uid)
        if not user:
            raise HTTPException(404, "user not found")
        return [user]
    assert_global_privilege(current, "admin")
    return crud.list_users(db)


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


@router.get("/group", response_model=List[schemas.GroupOut])
def list_or_get_group(
    group_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    if group_id:
        grp = crud.get_group(db, group_id)
        if not grp:
            raise HTTPException(404, "group not found")
        return [grp]

    return crud.list_groups(db)


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
    # plain users can self-register; anything else requires moderator+
    if payload.user_id != current.user_id:
        assert_global_privilege(current, "moderator")
    participation = crud.register_contest_participation(db, payload)
    return {"detail": "participation recorded", "participation_id": participation.contest_id}

# ---------- contest look-up ----------
@router.get("/contest", response_model=List[schemas.ContestParticipationOut])
def get_contest_participations(
    gid: Optional[str] = Query(None, description="group id"),
    uid: Optional[str] = Query(None, description="user id"),
    cid: Optional[str] = Query(None, description="contest id"),
    db: Session = Depends(database.get_db),
):
    if gid is None and uid is None and cid is None:
        raise HTTPException(400, "provide at least one of gid, uid, or cid")
    return crud.filter_contest_participations(db, gid, uid, cid)
