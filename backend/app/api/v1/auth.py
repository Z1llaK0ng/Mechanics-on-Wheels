from datetime import timedelta

from appwrite.id import ID
from appwrite.query import Query
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.appwrite_client import databases, DB_ID, COL_MECHANICS
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user
from app.config import settings
from app.schemas.auth import Token
from app.schemas.mechanic import MechanicCreate, MechanicResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=MechanicResponse, status_code=status.HTTP_201_CREATED)
def register_mechanic(mechanic_data: MechanicCreate):
    """Register a new mechanic account."""
    existing = databases.list_documents(
        database_id=DB_ID,
        collection_id=COL_MECHANICS,
        queries=[Query.equal("email", mechanic_data.email)]
    )
    if existing["total"] > 0:
        raise HTTPException(status_code=400, detail="Email already registered")

    doc = databases.create_document(
        database_id=DB_ID,
        collection_id=COL_MECHANICS,
        document_id=ID.unique(),
        data={
            "first_name": mechanic_data.first_name,
            "last_name": mechanic_data.last_name,
            "email": mechanic_data.email,
            "hashed_password": get_password_hash(mechanic_data.password),
            "shop_id": mechanic_data.shop_id,
            "active_status": True,
        }
    )

    try:
        from app.core.appwrite_client import COL_SHOP
        shop_doc = databases.get_document(DB_ID, COL_SHOP, mechanic_data.shop_id)
        shop_name = shop_doc.get("shop_name", "Unknown Shop")
    except Exception:
        shop_name = "Unknown Shop"

    return MechanicResponse(
        id=doc["$id"],
        first_name=doc["first_name"],
        last_name=doc["last_name"],
        email=doc["email"],
        shop_id=doc["shop_id"],
        active_status=doc["active_status"],
        full_name=f"{doc['first_name']} {doc['last_name']}",
        shop_name=shop_name,
    )


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login — returns JWT access token."""
    result = databases.list_documents(
        database_id=DB_ID,
        collection_id=COL_MECHANICS,
        queries=[Query.equal("email", form_data.username)]
    )
    docs = result["documents"]

    if not docs or not verify_password(form_data.password, docs[0]["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    mechanic = docs[0]
    if not mechanic.get("active_status", False):
        raise HTTPException(status_code=403, detail="Account is inactive")

    access_token = create_access_token(
        data={"sub": mechanic["email"], "role": "mechanic", "shop_id": mechanic.get("shop_id", "")},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=MechanicResponse)
def get_current_mechanic(current_user: dict = Depends(get_current_user)):
    """Get current authenticated mechanic's profile."""
    try:
        from app.core.appwrite_client import COL_SHOP
        shop_doc = databases.get_document(DB_ID, COL_SHOP, current_user.get("shop_id", ""))
        shop_name = shop_doc.get("shop_name", "Unknown Shop")
    except Exception:
        shop_name = "Unknown Shop"

    return MechanicResponse(
        id=current_user["$id"],
        first_name=current_user.get("first_name", ""),
        last_name=current_user.get("last_name", ""),
        email=current_user.get("email", ""),
        shop_id=current_user.get("shop_id", ""),
        active_status=current_user.get("active_status", True),
        full_name=f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}",
        shop_name=shop_name,
        staffrole=current_user.get("staffrole", "technician"),
        can_push_global_db=current_user.get("can_push_global_db", False),
    )
