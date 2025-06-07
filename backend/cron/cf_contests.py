#!/usr/bin/env python3
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Add the parent directory to the path so we can import from app
# This allows us to import modules from the 'app' directory, e.g., app.crud
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables from .env file
load_dotenv()

# Imports from our 'app' directory, must be after sys.path modification
from app.crud import update_upcoming_contests, update_finished_contests, update_contest_ratings_for_group
from app import models  # Required for querying app.models.Group

def main():
    """
    Main cron job function to:
    1. Fetch all upcoming contests from Codeforces and update the database.
    2. Update details for recently finished contests from Codeforces.
    3. For all finished contests that were just updated, trigger rating recalculations for all groups.
    
    Relies on DATABASE_URL environment variable for database connection.
    """
    # Get database URL from environment variable, with a fallback for local development
    database_url = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    
    # Setup database engine and session factory
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create a new database session
    db: Session = SessionLocal()
    
    try:
        print("Starting Codeforces contest and rating update cron job...")

        # Step 1: Fetch and update upcoming contests
        print("Fetching upcoming contests from Codeforces...")
        update_upcoming_contests(db)
        print("Successfully updated upcoming contests.")

        # Step 2: Update information for finished contests
        print("Updating finished contests from Codeforces...")
        # Calling with group_id=None and cutoff_days=None to perform a general update
        # based on the default behavior of cf_api.fetch_finished_contests
        updated_contest_ids = update_finished_contests(db, group_id=None, cutoff_days=10)
        
        if updated_contest_ids:
            print(f"Successfully updated finished contests. Contests processed: {', '.join(updated_contest_ids)}")
        else:
            print("No finished contests were updated in this run.")

        # Step 3: For newly updated finished contests, update rating changes for all groups
        if updated_contest_ids:
            print("Updating contest ratings for groups based on recently finished contests...")
            all_groups = db.query(models.Group).all() # Fetch all groups
            
            if not all_groups:
                print("No groups found in the database. Skipping group rating updates.")
            else:
                print(f"Found {len(all_groups)} groups to process.")
                for contest_id in updated_contest_ids:
                    print(f"  Processing ratings for contest: {contest_id}")
                    for group in all_groups:
                        # Assuming group model has an 'id' attribute for the group's unique identifier
                        group_id_str = str(group.group_id) 
                        print(f"    Updating ratings for group ID: {group_id_str}...")
                        try:
                            # update_contest_ratings_for_group calculates and applies rating changes
                            # It might return details about changes, which can be logged if needed.
                            rating_changes = update_contest_ratings_for_group(db, group_id=group_id_str, contest_id=contest_id)
                            if rating_changes: # Assuming it returns a list/dict of changes
                                print(f"      Ratings updated for {len(rating_changes)} members in group {group_id_str} for contest {contest_id}.")
                            else:
                                print(f"      No rating changes or no eligible participants for group {group_id_str} in contest {contest_id}.")
                        except Exception as e_group_rating:
                            # Log error for specific group/contest and continue with others
                            print(f"      ERROR updating ratings for group {group_id_str}, contest {contest_id}: {str(e_group_rating)}")
                print("Finished updating contest ratings for all groups and relevant contests.")
        
        print("Codeforces contest and rating update cron job finished successfully.")

    except Exception as e:
        # Catch any other exceptions during the job
        print(f"FATAL ERROR during Codeforces cron job: {str(e)}")
        raise # Re-raise the exception to ensure the cron system logs it as a failure
    finally:
        # Always close the database session
        if db:
            db.close()
        print("Database session closed.")

if __name__ == "__main__":
    main()
