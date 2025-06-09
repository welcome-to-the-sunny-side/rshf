from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

load_dotenv()

# Use the environment variable DATABASE_URL if available, otherwise use a default local URL for development
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", 'postgresql://evapilotno17:devpass@localhost:5432/evapilotno17?sslmode=prefer')
# SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", 'postgresql://evapilotno17@localhost:5432/rshfdb')
# SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", 'postgresql://dev:devpass@localhost:5432/clean-rating')

# Handle potential 'postgres://' to 'postgresql://' conversion needed for SQLAlchemy
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith('postgres://'):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace('postgres://', 'postgresql://', 1)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,         # ping with SELECT 1 before every checkout
    pool_recycle=300,           # recycle any connection >5 min old
    connect_args={
        "sslmode": "prefer",   # Render’s PG insists on SSL
        # optional keep-alives – they help on flaky networks
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    },
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
