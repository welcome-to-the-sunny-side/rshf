from dotenv import load_dotenv
load_dotenv()

import logging
import os
import asyncio
import redis.asyncio as redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_limiter import FastAPILimiter

from app.database import Base, engine, SessionLocal
from app import models # This will ensure models are registered with Base.metadata
from app.models import User, Group, GroupMembership, Role
from app.endpoints import router as api_router
from app.utils import hash_password
# from app.crud import update_upcoming_contests, update_finished_contests # Not used in startup

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

logger.info("🚀 Application starting up...")

logger.info("Ensuring database tables are created...")
Base.metadata.create_all(bind=engine)
logger.info("✅ Database tables ensured.")

app = FastAPI(title="rshf api")
logger.info("✅ FastAPI app instance created.")

async def prepopulate_database():
    """Background task to prepopulate the database with initial data.
    This runs asynchronously after the app has started to avoid blocking startup."""
    logger.info("🌱 Starting database prepopulation in background task...")
    db = None  # Initialize db to None to ensure it's defined in finally block
    try:
        db = SessionLocal()
        logger.info("ℹ️ Database session started for prepopulation.")
        
        default_password = "devpass"
        hashed_default_password = hash_password(default_password)
        
        users_to_create = [
            User(
                user_id='negative-xp',
                role='admin',
                cf_handle='negative-xp',
                email_id='nonadhocproblems@gmail.com',
                hashed_password=hashed_default_password,
            ),
            User(
                user_id='roomTemperatureIQ',
                role='admin',
                cf_handle='roomTemperatureIQ',
                email_id='evapilotno17@gmail.com',
                hashed_password=hashed_default_password,
            )
        ]
        
        # Add users with logging at each step
        for user_data in users_to_create:
            try:
                logger.info(f"Querying for existing user: {user_data.user_id}")
                existing_user = db.query(User).filter(User.user_id == user_data.user_id).first()
                logger.info(f"Query completed for user: {user_data.user_id}")
                
                if not existing_user:
                    db.add(user_data)
                    logger.info(f"➕ Creating admin user: {user_data.user_id}")
                else:
                    logger.info(f"ℹ️ Admin user {user_data.user_id} already exists.")
            except Exception as e:
                logger.error(f"❌ Error processing user {user_data.user_id}: {e}")
        
        # Create main group with detailed logging
        try:
            logger.info("Creating main group if needed...")
            main_group_data = Group(
                group_id='main',
                group_name='main',
                group_description='the main group - all users will be a part of this group',
                is_private=False
            )
            
            existing_group = db.query(Group).filter(Group.group_id == main_group_data.group_id).first()
            if not existing_group:
                db.add(main_group_data)
                logger.info(f"➕ Creating main group: {main_group_data.group_id}")
            else:
                logger.info(f"ℹ️ Main group {main_group_data.group_id} already exists.")
        except Exception as e:
            logger.error(f"❌ Error creating main group: {e}")
        
        # Commit changes so far
        try:
            logger.info("Committing users and group...")
            db.commit()
            logger.info("✅ Users and group committed to database.")
        except Exception as e:
            logger.error(f"❌ Error committing users and group: {e}")
            db.rollback()
        
        # Create memberships with detailed logging
        for user_data in users_to_create:
            try:
                logger.info(f"Processing membership for user: {user_data.user_id}")
                membership = db.query(GroupMembership).filter(
                    GroupMembership.user_id == user_data.user_id,
                    GroupMembership.group_id == 'main'
                ).first()
                
                if not membership:
                    new_membership = GroupMembership(
                        user_id=user_data.user_id,
                        group_id='main',
                        role=Role.admin,
                        cf_handle=user_data.cf_handle
                    )
                    db.add(new_membership)
                    logger.info(f"➕ Added {user_data.user_id} to main group with admin role.")
                else:
                    logger.info(f"ℹ️ Membership for {user_data.user_id} in main group already exists.")
            except Exception as e:
                logger.error(f"❌ Error processing membership for {user_data.user_id}: {e}")
        
        # Final commit
        try:
            logger.info("Committing memberships...")
            db.commit()
            logger.info("✅ Memberships committed. Database prepopulation complete.")
        except Exception as e:
            logger.error(f"❌ Error committing memberships: {e}")
            db.rollback()
    except Exception as e:
        logger.error(f"❌ Error during database prepopulation: {e}")
        if db: # Check if db session was successfully created
            db.rollback()
            logger.info("↩️ Database transaction rolled back.")
    finally:
        if db: # Check if db session was successfully created
            db.close()
            logger.info("ℹ️ Database session closed for prepopulation.")
        logger.info("🏁 Database prepopulation task finished.")

@app.on_event("startup")
async def startup():
    logger.info("🚀 Executing startup event...")
    # Initialize Redis for rate limiting
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        logger.error("❌ REDIS_URL environment variable not set. Rate limiting will not work.")
    else:
        logger.info(f"🔌 Connecting to Redis at {redis_url}...")
        try:
            r = redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
            await r.ping() # Verify connection
            await FastAPILimiter.init(r)
            logger.info("✅ Redis initialized and FastAPILimiter configured.")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Redis or FastAPILimiter: {e}")
    
    # Schedule database prepopulation as a background task
    logger.info("📋 Scheduling database prepopulation as background task...")
    # Create a background task that won't block startup
    asyncio.create_task(prepopulate_database())
    
    logger.info("🏁 Startup event finished - app can now bind to port and accept connections.")

@app.on_event("shutdown")
async def shutdown():
    logger.info("🌙 Executing shutdown event...")
    await FastAPILimiter.close()
    logger.info("🔌 FastAPILimiter closed.")
    logger.info("🏁 Shutdown event finished.")

logger.info("🔌 Including API router...")
app.include_router(api_router)
logger.info("✅ API router included.")

# Removed global db = SessionLocal()

logger.info("➕ Adding CORS middleware...")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://rshf.net",
        "https://rshf-frontend.onrender.com",
        "*", # Consider restricting this in production for security
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
)
logger.info("✅ CORS middleware added.")

logger.info("🎉 Application setup complete. Ready to serve requests.")
