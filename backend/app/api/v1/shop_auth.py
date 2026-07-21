"""
Shop Portal Authentication
--------------------------
POST /auth/shop-register  — Register a new shop (public)
POST /auth/shop-login     — Login as shop admin or mechanic

Mechanic login requires:  email + password + shop_id (form field)
Admin login requires:     email + password
"""
from datetime import timedelta
from typing import Optional

from appwrite.id import ID
from appwrite.query import Query
from fastapi import APIRouter, Form, HTTPException, status

from app.core.appwrite_client import databases, DB_ID, COL_SHOP, COL_MECHANICS, COL_ACTIVE_SUBS
from app.core.security import verify_password, get_password_hash, create_access_token
from app.config import settings
from app.schemas.shop import (
    ShopCreate, ShopResponse,
    ShopLoginResponse, ShopUserPayload,
    MechanicLoginResponse, MechanicUserPayload,
)

router = APIRouter(prefix="/auth", tags=["Shop Authentication"])


# ── Helper ────────────────────────────────────────────────────────────────────

def _subscribed_module_ids(shop_id: str) -> list[str]:
    """Return subscription IDs for a shop from active_subs collection."""
    try:
        result = databases.list_documents(
            database_id=DB_ID,
            collection_id=COL_ACTIVE_SUBS,
            queries=[Query.equal("shop_id", shop_id)]
        )
        return [doc["subscription_id"] for doc in result.get("documents", [])]
    except Exception as e:
        print(f"[WARN] _subscribed_module_ids error: {e}")
        return []



# ── Register shop ─────────────────────────────────────────────────────────────

@router.post(
    "/shop-register",
    response_model=ShopResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new shop",
)
def shop_register(payload: ShopCreate):
    """
    Create a new shop account.
    Returns the created shop. The string `shop_id` is the Appwrite document ID.
    """
    # Check email uniqueness
    existing_email = databases.list_documents(
        database_id=DB_ID,
        collection_id=COL_SHOP,
        queries=[Query.equal("email", payload.email)]
    )
    if existing_email["total"] > 0:
        raise HTTPException(status_code=400, detail="A shop with this email already exists.")

    # Check name uniqueness
    existing_name = databases.list_documents(
        database_id=DB_ID,
        collection_id=COL_SHOP,
        queries=[Query.equal("shop_name", payload.shop_name)]
    )
    if existing_name["total"] > 0:
        raise HTTPException(status_code=400, detail="A shop with this name already exists.")

    doc = databases.create_document(
        database_id=DB_ID,
        collection_id=COL_SHOP,
        document_id=ID.unique(),
        data={
            "shop_name": payload.shop_name,
            "location": payload.location,
            "email": payload.email,
            "hashed_password": get_password_hash(payload.password),
        }
    )

    return ShopResponse(
        shop_id=doc["$id"],
        shop_name=doc["shop_name"],
        location=doc["location"],
        email=doc["email"],
    )


# ── Shop login (admin + mechanic) ─────────────────────────────────────────────

@router.post("/shop-login", summary="Login as shop admin or mechanic")
def shop_login(
    username: str = Form(...),
    password: str = Form(...),
    scope: str = Form(...),
    shop_id: Optional[str] = Form(None),
):
    token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    try:
        # ── Admin ─────────────────────────────────────────────────────────────────
        if scope == "admin":
            try:
                result = databases.list_documents(
                    database_id=DB_ID,
                    collection_id=COL_SHOP,
                    queries=[Query.equal("email", username)]
                )
                docs = result.get("documents", [])
            except Exception as e:
                print(f"[ERROR] Shop admin query failed: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error during shop lookup: {str(e)}"
                )

            if not docs or not verify_password(password, docs[0].get("hashed_password", "")):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email or password.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            shop = docs[0]
            token = create_access_token(
                data={"sub": shop.get("email", username), "role": "admin", "shop_id": shop["$id"]},
                expires_delta=token_expires,
            )
            modules = _subscribed_module_ids(shop["$id"])
            return ShopLoginResponse(
                access_token=token,
                user=ShopUserPayload(
                    id=shop["$id"],
                    name=shop.get("shop_name", "Shop Admin"),
                    email=shop.get("email", username),
                    role="admin",
                    shopId=shop["$id"],
                    shopName=shop.get("shop_name", "Shop"),
                    subscribedModules=modules,
                ),
            )

        # ── Mechanic ──────────────────────────────────────────────────────────────
        elif scope == "mechanic":
            if not shop_id:
                raise HTTPException(status_code=422, detail="shop_id is required for mechanic login.")

            # Validate shop exists
            try:
                shop = databases.get_document(DB_ID, COL_SHOP, shop_id)
            except Exception as e:
                print(f"[ERROR] Shop get_document failed: {e}")
                raise HTTPException(status_code=404, detail=f"Shop not found: {str(e)}")

            # Find mechanic by email + shop
            try:
                mec_result = databases.list_documents(
                    database_id=DB_ID,
                    collection_id=COL_MECHANICS,
                    queries=[
                        Query.equal("email", username),
                        Query.equal("shop_id", shop_id),
                    ]
                )
                mec_docs = mec_result.get("documents", [])
            except Exception as e:
                print(f"[ERROR] Mechanic query failed: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error during mechanic lookup: {str(e)}"
                )

            if not mec_docs or not verify_password(password, mec_docs[0].get("hashed_password", "")):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email, password, or Shop ID.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            mechanic = mec_docs[0]
            if not mechanic.get("active_status", False):
                raise HTTPException(status_code=403, detail="Your account has been deactivated.")

            token = create_access_token(
                data={
                    "sub": mechanic.get("email", username),
                    "role": "mechanic",
                    "shop_id": shop_id,
                    "mechanic_id": mechanic["$id"],
                },
                expires_delta=token_expires,
            )
            modules = _subscribed_module_ids(shop_id)
            full_name = f"{mechanic.get('first_name', '')} {mechanic.get('last_name', '')}".strip()
            return MechanicLoginResponse(
                access_token=token,
                user=MechanicUserPayload(
                    id=mechanic["$id"],
                    name=full_name or "Mechanic",
                    email=mechanic.get("email", username),
                    role="mechanic",
                    shopId=shop_id,
                    shopName=shop.get("shop_name", ""),
                    subscribedModules=modules,
                    permittedModules=mechanic.get("permitted_modules", []),
                    staffrole=mechanic.get("staffrole", "technician"),
                ),
            )

        else:
            raise HTTPException(status_code=400, detail="scope must be 'admin' or 'mechanic'.")
    except Exception as e:
        print(f"[ERROR] Unexpected login exception: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )
