from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from app.database import Base, engine
from app import models
from app.endpoints import router as api_router


from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)
app = FastAPI(title="clean-rating api")
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",                                         # Vite dev server
        "http://127.0.0.1:5173",                                         # Vite dev server alternative
        "chrome-extension://bipobjdhjpdmpdmphgebogipnnfaccpf",           # Your specific Chrome extension ID
        "https://rshf.net",                                              # Production domain
        "https://rshf-frontend.onrender.com"                             # Render.com frontend domain
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"]
)


print("✅ tables created & routes loaded. ready to go.")
