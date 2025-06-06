from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from app.database import Base, engine
from app import models
from app.endpoints import router as api_router
import asyncio
from app.crud import update_upcoming_contests, update_finished_contests
from app.database import SessionLocal
import os
from fastapi_limiter import FastAPILimiter

from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis

Base.metadata.create_all(bind=engine)
app = FastAPI(title="rshf api")

@app.on_event("startup")
async def startup():
    redis_url = os.getenv("REDIS_URL")
    r = redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(r)

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
