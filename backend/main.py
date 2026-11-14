import os

try:
    from dotenv import load_dotenv
    load_dotenv()           # loads backend/.env if present
except ImportError:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import Base, engine
from routers import analytics, audits, bins, classifications, dashboard, external, verifications
from seed_data import run_seed

# ---------------------------------------------------------------------------
# Create tables & seed
# ---------------------------------------------------------------------------
Base.metadata.create_all(bind=engine)
run_seed()

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="EcoVision Audit API", version="1.0.0")

# CORS configuration
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]
frontend_env = os.getenv("FRONTEND_URL")
if frontend_env:
    allowed_origins.append(frontend_env.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https:\/\/.*(\.netlify\.app|\.trycloudflare\.com|\.koyeb\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for static serving
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(dashboard.router)
app.include_router(bins.router)
app.include_router(audits.router)
app.include_router(classifications.router)
app.include_router(verifications.router)
app.include_router(analytics.router)
app.include_router(external.router)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "healthy", "service": "EcoVision Audit API"}
