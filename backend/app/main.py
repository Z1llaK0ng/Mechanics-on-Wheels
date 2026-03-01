from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="API for Ghana's informal mechanic sector — Appwrite-backed ERP system",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    """Verify Appwrite connectivity on startup."""
    try:
        from app.core.appwrite_client import databases, DB_ID
        databases.get(DB_ID)
        print(f"[OK] Appwrite connected — database '{DB_ID}' is ready")
    except Exception as e:
        print(f"[WARN] Appwrite health check failed: {e}")
        print("[WARN] Check APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, and APPWRITE_API_KEY in .env")


@app.get("/")
def root():
    return {"message": "Welcome to MechanicERP API", "version": "1.0.0", "status": "operational"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/debug-config")
def debug_config():
    from app.core.appwrite_client import DB_ID
    from app.config import settings
    return {"db_id": DB_ID, "env_db_id": settings.APPWRITE_DB_ID}


# Include API routers
from app.api.v1.router import api_router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
