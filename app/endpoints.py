from datetime import datetime, timedelta
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app import schemas, crud, database


router = APIRouter(prefix="/api")
# auth stufff
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/user/login")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 998244353

def get_db():
    db = next(database.get_db())
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/user/register", response_model=schemas.UserOut)
def register_user(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    if crud.get_user(db, payload.user_id):
        raise HTTPException(status_code=400, detail="user already exists")
    return crud.create_user(db, payload)

@router.post("/user/login", response_model=schemas.TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, form.username, form.password)
    print(form.username, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="invalid credentials")
    token = create_access_token({"sub": user.user_id})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/user", response_model=List[schemas.UserOut])
def list_or_get_user(uid: Optional[str] = Query(None), db: Session = Depends(get_db)):
    if uid:
        user = crud.get_user(db, uid)
        if not user:
            raise HTTPException(status_code=404, detail="user not found")
        return [user]
    return crud.list_users(db)


@router.put("/user", response_model=schemas.UserOut)
def update_user(
    user_id: str = Query(...),
    payload: schemas.UserUpdate = Depends(),
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
):
    try:
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="unauthorized")

    updated = crud.update_user(db, user_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="user not found")
    return updated

@router.post("/group/register", response_model=schemas.GroupOut)
def register_group(payload: schemas.GroupRegister, db: Session = Depends(get_db)):
    if crud.get_group(db, payload.group_id):
        raise HTTPException(status_code=400, detail="group already exists")
    return crud.create_group(db, payload)


@router.get("/group", response_model=List[schemas.GroupOut])
def list_or_get_group(group_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    if group_id:
        group = crud.get_group(db, group_id)
        if not group:
            raise HTTPException(status_code=404, detail="group not found")
        return [group]
    return crud.list_groups(db)


@router.put("/group", response_model=schemas.GroupOut)
def update_group(payload: schemas.GroupUpdate, db: Session = Depends(get_db)):
    updated = crud.update_group(db, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="group not found")
    return updated


@router.post("/add_to_group", response_model=schemas.GroupMembershipOut)
def add_to_group(payload: schemas.GroupMembershipAdd, db: Session = Depends(get_db)):
    return crud.add_membership(db, payload)


@router.post("/remove_from_group")
def remove_from_group(payload: schemas.GroupMembershipRemove, db: Session = Depends(get_db)):
    success = crud.remove_membership(db, payload.user_id, payload.group_id)
    if not success:
        raise HTTPException(status_code=404, detail="membership not found")
    return {"detail": "membership removed"}

@router.post("/register_rated")
def register_rated(payload: schemas.ContestRegistration, db: Session = Depends(get_db)):
    participation = crud.register_contest_participation(db, payload)
    return {"detail": "participation recorded", "participation_id": participation.contest_id}
