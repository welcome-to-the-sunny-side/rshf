from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app import schemas, crud, database
from app.schemas import Token
from app.utils import verify_password
from datetime import timedelta, datetime
from jose import JWTError, jwt
import os


router = APIRouter(prefix="/api")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")


SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 998244353


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(db: Session = Depends(database.get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_username(db, username)
    if user is None:
        raise credentials_exception
    return user

@router.get("", response_class=HTMLResponse, include_in_schema=False)
def root():
    return """
    <html>
        <head>
            <title>clean-rating api</title>
            <style>
                body { font-family: monospace; background: #111; color: #eee; padding: 2rem; line-height: 1.6; }
                h1 { color: #ff4081; }
                h2 { color: #00d4ff; margin-top: 2em; }
                code { background: #222; padding: 0.2em 0.4em; border-radius: 4px; }
                pre { background: #1a1a1a; padding: 1em; border-radius: 6px; overflow-x: auto; }
            </style>
        </head>
        <body>
            <h1>clean-rating api</h1>
            <p>you’ve reached the root of the api router. here’s a quick rundown of the available endpoints:</p>

            <h2>🔐 POST /api/token</h2>
            <p>obtain a bearer token by passing Codeforces handle as username + password</p>
            <pre>
form:
  username: str  # cf_handle
  password: str

response:
  {
    "access_token": "...",
    "token_type": "bearer"
  }
            </pre>

            <h2>👤 POST /api/users</h2>
            <p>register a new user</p>
            <pre>
payload:
{
  "user_id": "user123",
  "cf_handle": "tourist",
  "username": "tourist",  // alias for cf_handle
  "password": "hunter2",
  "internal_default_rated": true,
  "trusted_score": 0
}

response:
{
  "user_id": "user123",
  "cf_handle": "tourist",
  "username": "tourist",
  "internal_default_rated": true,
  "trusted_score": 0
}
            </pre>

            <h2>👁️ GET /api/me</h2>
            <p>get current user details (requires Authorization header)</p>
            <pre>
Authorization: Bearer &lt;access_token&gt;
            </pre>

            <h2>👥 POST /api/groups</h2>
            <p>create a new rating group</p>
            <pre>
payload:
{
  "group_id": "mathboys",
  "group_name": "mathboys"
}
            </pre>

            <h2>📡 GET /api/groups/{group_id}</h2>
            <p>fetch group info by id</p>

            <h2>🧪 for Swagger-style docs:</h2>
            <p>visit <a href="/docs" style="color:#00ff99">/docs</a> for interactive testing</p>
        </body>
    </html>
    """



@router.post("/users", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = crud.get_user_by_username(db, user.cf_handle)
    if db_user:
        raise HTTPException(status_code=400, detail="username already registered")
    return crud.create_user(db, user)

@router.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = crud.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="invalid username or password")
    access_token = create_access_token(data={"sub": user.cf_handle})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.User)
def read_users_me(current_user: schemas.User = Depends(get_current_user)):
    return current_user

@router.post("/groups", response_model=schemas.Group)
def create_group(group: schemas.GroupCreate, db: Session = Depends(database.get_db)):
    return crud.create_group(db, group)

@router.get("/groups/{group_id}", response_model=schemas.Group)
def read_group(group_id: str, db: Session = Depends(database.get_db)):
    group = crud.get_group(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="group not found")
    return group
