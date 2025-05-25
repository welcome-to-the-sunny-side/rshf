# app/tasks.py
"""
Scheduled tasks for the application.
Handles periodic fetching and updating of Codeforces contests.
"""

import logging
from datetime import datetime
from typing import List, Dict, Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from app.codeforces_api import CodeforcesAPI
from app.database import SessionLocal
from app.models import Contest
from app import crud

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize scheduler
scheduler = AsyncIOScheduler()

# Initialize Codeforces API client
cf_api = CodeforcesAPI()


def get_db_session() -> Session:
    """Get a database session for the task."""
    return SessionLocal()


def map_cf_contest_to_internal(cf_contest: Dict[str, Any]) -> Dict[str, Any]:
    contest_id = f"cf_{cf_contest['id']}"
    return {
        "contest_id": contest_id,
        "contest_name": cf_contest.get("name", "Unknown Contest"),
        "platform": "Codeforces",
        "start_time_posix": cf_contest.get("startTimeSeconds", 0),
        "duration_seconds": cf_contest.get("durationSeconds", 0),
        "link": f"https://codeforces.com/contest/{cf_contest['id']}",
        "internal_contest_identifier": (cf_contest['id']),
        "finished": cf_contest.get("phase", "BEFORE") == "FINISHED"
    }


async def fetch_and_update_contests():
    """
    Fetch contests from Codeforces API and update the database.
    This function is called by the scheduler.
    """
    db = get_db_session()
    
    try:
        logger.info("Starting Codeforces contest sync...")
        
        # Fetch all contests from Codeforces
        cf_contests = cf_api.contest_list(gym=False)
        logger.info(f"Fetched {len(cf_contests)} contests from Codeforces API")
        
        # Statistics
        new_contests = 0
        updated_contests = 0
        errors = 0
        
        for cf_contest in cf_contests:
            try:
                # Map to internal format
                contest_data = map_cf_contest_to_internal(cf_contest)
                
                # Check if contest already exists
                existing_contest = crud.get_contest_by_internal_identifier(db, contest_data["id"])
                
                if existing_contest:
                    # Update existing contest if status changed
                    if existing_contest.finished != contest_data["finished"]:
                        updated = crud.update_contest(
                            db,
                            contest_id=contest_data["contest_id"],
                            finished=contest_data["finished"],
                            contest_name=contest_data["contest_name"],  # Update name in case it changed
                            start_time_posix=contest_data["start_time_posix"],
                            duration_seconds=contest_data["duration_seconds"]
                        )
                        if updated:
                            updated_contests += 1
                            logger.info(f"Updated contest: {contest_data['contest_name']} (finished: {contest_data['finished']})")
                else:
                    # Create new contest
                    created = crud.create_contest(db, contest_data)
                    if created:
                        new_contests += 1
                        logger.info(f"Added new contest: {contest_data['contest_name']}")
                        
            except Exception as e:
                errors += 1
                logger.error(f"Error processing contest {cf_contest.get('id', 'unknown')}: {str(e)}")
                continue
        
        # Log summary
        logger.info(f"Contest sync completed. New: {new_contests}, Updated: {updated_contests}, Errors: {errors}")
        
        # Optionally, fetch standings for recently finished contests
        await fetch_standings_for_finished_contests(db)
        
    except Exception as e:
        logger.error(f"Failed to fetch contests from Codeforces: {str(e)}")
    finally:
        db.close()


async def fetch_standings_for_finished_contests(db: Session):
    """
    Fetch standings for recently finished contests that don't have standings yet.
    """
    try:
        # Get finished contests without standings (limit to recent ones to avoid too many API calls)
        recent_contests = crud.get_recent_finished_contests_without_standings(db, limit=5)
        
        for contest in recent_contests:
            try:
                # Extract Codeforces contest ID
                cf_contest_id = int(contest.internal_contest_identifier)
                
                # Fetch standings (only first 1000 participants to avoid huge data)
                logger.info(f"Fetching standings for contest: {contest.contest_name}")
                standings_data = cf_api.contest_standings(
                    contest_id=cf_contest_id,
                    show_unofficial=False
                )
                
                # Store standings in JSON field
                if standings_data and "rows" in standings_data:
                    standings_summary = {
                        "contest": standings_data.get("contest", {}),
                        "problems": standings_data.get("problems", []),
                        "rows": standings_data.get("rows", []) # Limit stored rows
                    }
                    
                    crud.update_contest_standings(
                        db,
                        contest_id=contest.contest_id,
                        standings=standings_summary
                    )
                    logger.info(f"Updated standings for contest: {contest.contest_name}")
                    
            except Exception as e:
                logger.error(f"Failed to fetch standings for contest {contest.contest_id}: {str(e)}")
                continue
                
    except Exception as e:
        logger.error(f"Error in fetch_standings_for_finished_contests: {str(e)}")


def init_scheduler():
    """
    Initialize and configure the scheduler with all tasks.
    This should be called from main.py when the app starts.
    """
    # Schedule contest sync job
    # Run every day at 6:00 AM UTC
    scheduler.add_job(
        fetch_and_update_contests,
        CronTrigger(hour=6, minute=0),
        id="fetch_codeforces_contests",
        name="Fetch Codeforces Contests",
        replace_existing=True
    )
    
    # Optional: Add more frequent sync for ongoing contests
    # Run every hour to catch contest status changes
    scheduler.add_job(
        fetch_and_update_contests,
        CronTrigger(minute=0),  # Every hour at :00
        id="fetch_codeforces_contests_hourly",
        name="Fetch Codeforces Contests (Hourly)",
        replace_existing=True
    )
    
    # Start the scheduler
    scheduler.start()
    logger.info("Scheduler initialized and started")


def shutdown_scheduler():
    """
    Shutdown the scheduler gracefully.
    This should be called when the app shuts down.
    """
    scheduler.shutdown()
    logger.info("Scheduler shut down")


# Manual trigger function for testing
async def trigger_contest_sync():
    """
    Manually trigger the contest sync.
    Useful for testing or manual updates via an API endpoint.
    """
    logger.info("Manual contest sync triggered")
    await fetch_and_update_contests()