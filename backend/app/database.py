from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Use the environment variable DATABASE_URL if available, otherwise use a default local URL for development
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", 'postgresql://dev:devpass@localhost:5432/clean-rating')

# Handle potential 'postgres://' to 'postgresql://' conversion needed for SQLAlchemy
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith('postgres://'):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace('postgres://', 'postgresql://', 1)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
