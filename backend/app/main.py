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

@app.on_event("startup")
async def startup():
    logger.info("🚀 Executing startup event...")
    # Initialize Redis for rate limiting
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
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
