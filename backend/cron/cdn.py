#!/usr/bin/env python3
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv()

# Import after sys.path is updated
from app.r2_utils import write_extension_data_to_r2
from app import models

def main():
    """
    Main function to update R2 with extension data.
    Uses DATABASE_URL environment variable for database connection.
    """
    # Get database URL from environment variable with fallback
    database_url = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    
    # Create database engine and session
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create a database session
    db = SessionLocal()
    
    try:
        print("Starting R2 extension data update...")
        # Call the function to write extension data to R2
        extension_data_link, timestamp_link = write_extension_data_to_r2(db)
        print(f"Extension data updated successfully!")
        print(f"Extension data link: {extension_data_link}")
        print(f"Timestamp link: {timestamp_link}")
    except Exception as e:
        print(f"Error updating extension data: {str(e)}")
        # Re-raise the exception if needed
        raise
    finally:
        # Close the database session
        db.close()

if __name__ == "__main__":
    main()
