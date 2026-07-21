from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.v1.router import api_router

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="API for Ghana's informal mechanic sector — Appwrite-backed ERP system",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
# NOTE: allow_origins=["*"] + allow_credentials=True is rejected by browsers.
# List explicit origins so the Authorization header is forwarded correctly.
origins = [origin.strip().rstrip('/') for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

from fastapi import Request
from fastapi.responses import JSONResponse

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*(\.pages\.dev|carryspanner\.com)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[ERROR] Global exception on {request.url.path}: {exc}")
    response = JSONResponse(
        status_code=500,
        content={"detail": str(exc) if settings.DEBUG else "Internal Server Error"}
    )
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response



@app.on_event("startup")
async def startup():
    """Verify Appwrite connectivity on startup."""
    try:
        from app.core.appwrite_client import databases, DB_ID, COL_SHOP
        from appwrite.query import Query
        databases.list_documents(database_id=DB_ID, collection_id=COL_SHOP, queries=[Query.limit(1)])
        print(f"[OK] Appwrite connected — database '{DB_ID}' is ready")
    except Exception as e:
        print(f"[WARN] Appwrite health check failed: {e}")
        print("[WARN] Check APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, and APPWRITE_API_KEY in .env")


@app.get("/")
def root():
    return {"message": "Welcome to CarrySpanner API", "version": "1.0.0", "status": "operational"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}

app.include_router(api_router, prefix=settings.API_V1_PREFIX)
