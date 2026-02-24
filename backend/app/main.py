from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.core.database import engine, Base

# Import all models to ensure they're registered with Base
from app.domain import (
    subscription, shop, mechanic, vehicle,
    vehicle_owner, job_card, active_sub
)

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="API for Ghana's informal mechanic sector - Offline-first ERP system",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on your frontend requirements
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    """Create database tables on startup."""
    # In production, use Alembic migrations instead
    if settings.DEBUG:
        try:
            Base.metadata.create_all(bind=engine)
            print("✅ Database tables created successfully")
        except Exception as e:
            print(f"⚠️  Database connection failed: {e}")
            print("⚠️  Server will run but database operations will fail")
            print("⚠️  Make sure MySQL is running and database exists")
            print(f"⚠️  Connection string: {settings.DATABASE_URL}")


@app.on_event("shutdown")
async def shutdown():
    """Cleanup on shutdown."""
    pass


@app.get("/")
def root():
    """Root endpoint - API health check."""
    return {
        "message": "Welcome to MechanicERP API",
        "version": "1.0.0",
        "status": "operational"
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# Import and include API routers
from app.api.v1.router import api_router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
