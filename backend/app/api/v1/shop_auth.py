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

from app.core.appwrite_client import (
    databases, DB_ID, COL_SHOP, COL_MECHANICS, COL_ACTIVE_SUBS,
    get_docs, get_total, get_field
)
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
        return [get_field(doc, "subscription_id") for doc in get_docs(result) if get_field(doc, "subscription_id")]
    except Exception as e:
        print(f"[WARN] _subscribed_module_ids error: {e}")
        return []


@router.get("/debug-auth")
def debug_auth(email: str = "admin@chem1c.com"):
    try:
        res = databases.list_documents(
            database_id=DB_ID,
            collection_id=COL_SHOP,
            queries=[Query.equal("email", email.strip())]
        )
        docs = get_docs(res)
        if not docs:
            return {"status": "not_found", "docs_count": 0}
        shop = docs[0]
        h = get_field(shop, "hashed_password", "")
        verified = verify_password("chem1c22", h)
        return {
            "status": "found",
            "shop_name": get_field(shop, "shop_name", ""),
            "hash_len": len(h),
            "hash_starts_with": h[:10] if h else "",
            "verified_chem1c22": verified
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}


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
    clean_email = payload.email.strip()
    clean_name = payload.shop_name.strip()

    # Check email uniqueness
    existing_email = databases.list_documents(
        database_id=DB_ID,
        collection_id=COL_SHOP,
        queries=[Query.equal("email", clean_email)]
    )
    if get_total(existing_email) > 0:
        raise HTTPException(status_code=400, detail="A shop with this email already exists.")

    # Check name uniqueness
    existing_name = databases.list_documents(
        database_id=DB_ID,
        collection_id=COL_SHOP,
        queries=[Query.equal("shop_name", clean_name)]
    )
    if get_total(existing_name) > 0:
        raise HTTPException(status_code=400, detail="A shop with this name already exists.")

    doc = databases.create_document(
        database_id=DB_ID,
        collection_id=COL_SHOP,
        document_id=ID.unique(),
        data={
            "shop_name": clean_name,
            "location": payload.location.strip(),
            "email": clean_email,
            "hashed_password": get_password_hash(payload.password),
        }
    )

    doc_id = get_field(doc, "$id") or get_field(doc, "id", "")
    return ShopResponse(
        shop_id=doc_id,
        shop_name=get_field(doc, "shop_name", clean_name),
        location=get_field(doc, "location", payload.location),
        email=get_field(doc, "email", clean_email),
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
    clean_username = username.strip()

    try:
        # ── Admin ─────────────────────────────────────────────────────────────────
        if scope == "admin":
            try:
                result = databases.list_documents(
                    database_id=DB_ID,
                    collection_id=COL_SHOP,
                    queries=[Query.equal("email", clean_username)]
                )
                docs = get_docs(result)
            except Exception as e:
                print(f"[ERROR] Shop admin query failed for '{clean_username}': {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error during shop lookup: {str(e)}"
                )

            if not docs:
                print(f"[WARN] No shop account found matching email: '{clean_username}'")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="No shop account found with this email address. Please check your email or register a new shop.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            shop = docs[0]
            stored_hash = get_field(shop, "hashed_password", "")
            if not verify_password(password, stored_hash):
                print(f"[WARN] Password verification failed for shop admin email: '{clean_username}'")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect password. Please verify your password and try again.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            shop_doc_id = get_field(shop, "$id") or get_field(shop, "id", "")
            shop_name = get_field(shop, "shop_name", "Shop Admin")
            shop_email = get_field(shop, "email", clean_username)
            
            token = create_access_token(
                data={"sub": shop_email, "role": "admin", "shop_id": shop_doc_id},
                expires_delta=token_expires,
            )
            modules = _subscribed_module_ids(shop_doc_id)
            return ShopLoginResponse(
                access_token=token,
                user=ShopUserPayload(
                    id=shop_doc_id,
                    name=shop_name,
                    email=shop_email,
                    role="admin",
                    shopId=shop_doc_id,
                    shopName=shop_name,
                    subscribedModules=modules,
                ),
            )

        # ── Mechanic ──────────────────────────────────────────────────────────────
        elif scope == "mechanic":
            if not shop_id:
                raise HTTPException(status_code=422, detail="shop_id is required for mechanic login.")

            clean_shop_id = shop_id.strip()

            # Validate shop exists
            try:
                shop = databases.get_document(DB_ID, COL_SHOP, clean_shop_id)
            except Exception as e:
                print(f"[ERROR] Shop get_document failed for shop_id '{clean_shop_id}': {e}")
                raise HTTPException(status_code=404, detail=f"Shop not found for ID: {clean_shop_id}")

            # Find mechanic by email + shop
            try:
                mec_result = databases.list_documents(
                    database_id=DB_ID,
                    collection_id=COL_MECHANICS,
                    queries=[
                        Query.equal("email", clean_username),
                        Query.equal("shop_id", clean_shop_id),
                    ]
                )
                mec_docs = get_docs(mec_result)
            except Exception as e:
                print(f"[ERROR] Mechanic query failed for '{clean_username}': {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error during mechanic lookup: {str(e)}"
                )

            if not mec_docs:
                print(f"[WARN] No mechanic account found for email: '{clean_username}' in shop '{clean_shop_id}'")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email, password, or Shop ID.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            mechanic = mec_docs[0]
            stored_hash = get_field(mechanic, "hashed_password", "")
            if not verify_password(password, stored_hash):
                print(f"[WARN] Password verification failed for mechanic email: '{clean_username}'")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect password. Please try again.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            if not get_field(mechanic, "active_status", False):
                raise HTTPException(status_code=403, detail="Your account has been deactivated.")

            mec_doc_id = get_field(mechanic, "$id") or get_field(mechanic, "id", "")
            mec_email = get_field(mechanic, "email", username)
            first_name = get_field(mechanic, "first_name", "")
            last_name = get_field(mechanic, "last_name", "")
            full_name = f"{first_name} {last_name}".strip()

            token = create_access_token(
                data={
                    "sub": mec_email,
                    "role": "mechanic",
                    "shop_id": shop_id,
                    "mechanic_id": mec_doc_id,
                },
                expires_delta=token_expires,
            )
            modules = _subscribed_module_ids(shop_id)
            return MechanicLoginResponse(
                access_token=token,
                user=MechanicUserPayload(
                    id=mec_doc_id,
                    name=full_name or "Mechanic",
                    email=mec_email,
                    role="mechanic",
                    shopId=shop_id,
                    shopName=get_field(shop, "shop_name", ""),
                    subscribedModules=modules,
                    permittedModules=get_field(mechanic, "permitted_modules", []),
                    staffrole=get_field(mechanic, "staffrole", "technician"),
                ),
            )

        else:
            raise HTTPException(status_code=400, detail="scope must be 'admin' or 'mechanic'.")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Unexpected login exception: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )
