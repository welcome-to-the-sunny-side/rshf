from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from app.database import Base, engine
from app import models
from app.endpoints import router as api_router

Base.metadata.create_all(bind=engine)
app = FastAPI(title="clean-rating api")
app.include_router(api_router)

print("✅ tables created & routes loaded. ready to go.")
