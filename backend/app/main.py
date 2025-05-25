from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from app.database import Base, engine
from app import models
from app.endpoints import router as api_router
import asyncio
from app.crud import update_upcoming_contests, update_finished_contests


from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)
app = FastAPI(title="clean-rating api")
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",                                         # Vite dev server
        "http://127.0.0.1:5173",                                         # Vite dev server alternative
        "chrome-extension://bipobjdhjpdmpdmphgebogipnnfaccpf"            # Your specific Chrome extension ID
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"]
)

async def run_cf_cron_job():
    while True:
        update_upcoming_contests()
        update_finished_contests()
        await asyncio.sleep(60 * 60 * 24)  # run every 24 hours


@app.on_event("startup")
async def launch_cf_cron_job():
    asyncio.create_task(run_cf_cron_job())

print("✅ tables created & routes loaded. ready to go.")