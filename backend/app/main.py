from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from app.database import Base, engine
from app import models
from app.models import User, Group, GroupMembership, Role
from app.endpoints import router as api_router
import asyncio
from app.crud import update_upcoming_contests, update_finished_contests
from app.database import SessionLocal
import os
from fastapi_limiter import FastAPILimiter
from app.utils import hash_password

from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis

Base.metadata.create_all(bind=engine)
app = FastAPI(title="rshf api")

@app.on_event("startup")
async def startup():
    # Initialize Redis for rate limiting
    redis_url = os.getenv("REDIS_URL")
    r = redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(r)
    
    # Prepopulate the database with admin users, main group, and memberships
    try:
        db = SessionLocal()
        
        # Default password for admin users
        default_password = "devpass"
        
        # Create admin users if they don't exist
        users = [
            User(
                user_id='negative-xp',
                role='admin',
                cf_handle='negative-xp',
                email_id='nonadhocproblems@gmail.com',
                hashed_password=hash_password(default_password),
            ),
            User(
                user_id='roomTemperatureIQ',
                role='admin',
                cf_handle='roomTemperatureIQ',
                email_id='evapilotno17@gmail.com',
                hashed_password=hash_password(default_password),
            )
        ]
        
        for user in users:
            # Check if user already exists to avoid duplicates
            existing_user = db.query(User).filter(User.user_id == user.user_id).first()
            if not existing_user:
                db.add(user)
                print(f"✅ Created admin user: {user.user_id}")
        
        # Create main group if it doesn't exist
        main_group = Group(
            group_id='main',
            group_name='main',
            group_description='the main group - all users will be a part of this group',
            is_private=False
        )
        
        existing_group = db.query(Group).filter(Group.group_id == main_group.group_id).first()
        if not existing_group:
            db.add(main_group)
            print(f"✅ Created main group: {main_group.group_id}")
        
        # Commit to ensure users and group are in the database
        db.commit()
        
        # Add admin users to the main group with admin role
        for user in users:
            # Check if membership already exists
            membership = db.query(GroupMembership).filter(
                GroupMembership.user_id == user.user_id,
                GroupMembership.group_id == 'main'
            ).first()
            
            if not membership:
                membership = GroupMembership(
                    user_id=user.user_id,
                    group_id='main',
                    role=Role.admin,
                    cf_handle=user.cf_handle
                )
                db.add(membership)
                print(f"✅ Added {user.user_id} to main group with admin role")
        
        # Commit all changes
        db.commit()
    except Exception as e:
        print(f"❌ Error prepopulating database: {e}")
        db.rollback()
    finally:
        db.close()

@app.on_event("shutdown")
async def shutdown():
    await FastAPILimiter.close()

app.include_router(api_router)
db = SessionLocal()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",          # Vite dev server
        "http://127.0.0.1:5173",          # Vite dev server alternative
        "https://rshf.net",               # Production domain
        "https://rshf-frontend.onrender.com", # Render.com frontend domain
        "*",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
)

print("✅ tables created & routes loaded. ready to go.")
