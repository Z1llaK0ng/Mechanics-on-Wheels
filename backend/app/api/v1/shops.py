from datetime import datetime
from typing import Optional, List

from appwrite.id import ID
from appwrite.query import Query
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.appwrite_client import databases, DB_ID, COL_SHOP, COL_MECHANICS, COL_MODULE_GROUPS
from app.core.shop_security import get_current_shop_admin, get_current_shop_user
from app.core.security import get_password_hash, verify_password
from app.schemas.mechanic import MechanicResponse


router = APIRouter(prefix="/shops", tags=["Shops"])


class ShopUpdate(BaseModel):
    shop_name: Optional[str] = None
    location: Optional[str] = None


class MechanicCreateForShop(BaseModel):
    full_name: str
    email: str
    password: str
    staffrole: Optional[str] = "technician"


@router.patch("/{shop_id}", status_code=status.HTTP_200_OK)
def update_shop(
    shop_id: str,
    payload: ShopUpdate,
    current_admin: dict = Depends(get_current_shop_admin),
):
    """
    Update basic shop details (name, location).
    Only the owning shop admin can update their shop.
    """
    if current_admin.get("shop_id") != shop_id:
        raise HTTPException(status_code=403, detail="You can only update your own shop.")

    try:
        doc = databases.get_document(DB_ID, COL_SHOP, shop_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Shop not found.")

    data = {}
    if payload.shop_name is not None:
        data["shop_name"] = payload.shop_name
    if payload.location is not None:
        data["location"] = payload.location

    if not data:
        return {
            "shop_id": doc["$id"],
            "shop_name": doc.get("shop_name", ""),
            "location": doc.get("location", ""),
            "email": doc.get("email", ""),
        }

    updated = databases.update_document(
        database_id=DB_ID,
        collection_id=COL_SHOP,
        document_id=shop_id,
        data=data,
    )

    return {
        "shop_id": updated["$id"],
        "shop_name": updated.get("shop_name", ""),
        "location": updated.get("location", ""),
        "email": updated.get("email", ""),
    }


@router.get("/{shop_id}/mechanics", response_model=List[MechanicResponse])
def list_shop_mechanics(
    shop_id: str,
    current_user: dict = Depends(get_current_shop_user),
):
    """List mechanics belonging to the given shop (admin + staff)."""
    if current_user.get("shop_id") != shop_id:
        raise HTTPException(status_code=403, detail="You can only view your own shop's mechanics.")

    result = databases.list_documents(
        database_id=DB_ID,
        collection_id=COL_MECHANICS,
        queries=[Query.equal("shop_id", shop_id)],
    )
    mechanics = []
    for doc in result["documents"]:
        full_name = f"{doc.get('first_name', '')} {doc.get('last_name', '')}".strip()
        mechanics.append(
            MechanicResponse(
                id=doc["$id"],
                first_name=doc.get("first_name", ""),
                last_name=doc.get("last_name", ""),
                email=doc.get("email", ""),
                shop_id=doc.get("shop_id", ""),
                active_status=doc.get("active_status", False),
                full_name=full_name or None,
                staffrole=doc.get("staffrole", "technician"),
                permitted_modules=doc.get("permitted_modules", []),
                can_push_global_db=doc.get("can_push_global_db", False),
            )
        )
    return mechanics


@router.post("/{shop_id}/mechanics", response_model=MechanicResponse, status_code=status.HTTP_201_CREATED)
def create_mechanic_for_shop(
    shop_id: str,
    payload: MechanicCreateForShop,
    current_admin: dict = Depends(get_current_shop_admin),
):
    """Create a new mechanic under the current shop."""
    if current_admin.get("shop_id") != shop_id:
        raise HTTPException(status_code=403, detail="You can only create mechanics for your own shop.")

    # Split full name into first/last (best-effort)
    name_parts = payload.full_name.strip().split()
    first_name = name_parts[0]
    last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

    existing = databases.list_documents(
        database_id=DB_ID,
        collection_id=COL_MECHANICS,
        queries=[Query.equal("email", payload.email), Query.equal("shop_id", shop_id)],
    )
    if existing["total"] > 0:
        raise HTTPException(status_code=400, detail="A mechanic with this email already exists for this shop.")

    doc = databases.create_document(
        database_id=DB_ID,
        collection_id=COL_MECHANICS,
        document_id=ID.unique(),
        data={
            "first_name": first_name,
            "last_name": last_name,
            "email": payload.email,
            "hashed_password": get_password_hash(payload.password),
            "shop_id": shop_id,
            "active_status": True,
            "staffrole": payload.staffrole or "technician",
            "can_push_global_db": False,
        },
    )

    full_name = f"{doc.get('first_name', '')} {doc.get('last_name', '')}".strip()
    return MechanicResponse(
        id=doc["$id"],
        first_name=doc.get("first_name", ""),
        last_name=doc.get("last_name", ""),
        email=doc.get("email", ""),
        shop_id=doc.get("shop_id", ""),
        active_status=doc.get("active_status", False),
        full_name=full_name or None,
        staffrole=doc.get("staffrole", "technician"),
        permitted_modules=doc.get("permitted_modules", []),
        can_push_global_db=doc.get("can_push_global_db", False),
    )


@router.patch("/mechanics/{mechanic_id}", response_model=MechanicResponse)
def toggle_mechanic_active(
    mechanic_id: str,
    current_admin: dict = Depends(get_current_shop_admin),
):
    """Toggle mechanic active_status (simple enable/disable)."""
    # Load mechanic
    try:
        doc = databases.get_document(DB_ID, COL_MECHANICS, mechanic_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Mechanic not found.")

    if doc.get("shop_id") != current_admin.get("shop_id"):
        raise HTTPException(status_code=403, detail="You can only manage mechanics in your own shop.")

    new_status = not doc.get("active_status", False)
    updated = databases.update_document(
        database_id=DB_ID,
        collection_id=COL_MECHANICS,
        document_id=mechanic_id,
        data={"active_status": new_status},
    )

    full_name = f"{updated.get('first_name', '')} {updated.get('last_name', '')}".strip()
    return MechanicResponse(
        id=updated["$id"],
        first_name=updated.get("first_name", ""),
        last_name=updated.get("last_name", ""),
        email=updated.get("email", ""),
        shop_id=updated.get("shop_id", ""),
        active_status=updated.get("active_status", False),
        full_name=full_name or None,
        staffrole=updated.get("staffrole", "technician"),
        permitted_modules=updated.get("permitted_modules", []),
        can_push_global_db=updated.get("can_push_global_db", False),
    )


class StaffRoleUpdate(BaseModel):
    staffrole: str  # 'technician' | 'staff'


@router.patch("/mechanics/{mechanic_id}/staffrole", response_model=MechanicResponse)
def update_mechanic_staffrole(
    mechanic_id: str,
    payload: StaffRoleUpdate,
    current_admin: dict = Depends(get_current_shop_admin),
):
    """Change a mechanic's staffrole (technician ↔ staff)."""
    if payload.staffrole not in ("technician", "staff"):
        raise HTTPException(status_code=422, detail="staffrole must be 'technician' or 'staff'.")

    try:
        doc = databases.get_document(DB_ID, COL_MECHANICS, mechanic_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Mechanic not found.")

    if doc.get("shop_id") != current_admin.get("shop_id"):
        raise HTTPException(status_code=403, detail="You can only manage mechanics in your own shop.")

    updated = databases.update_document(
        database_id=DB_ID,
        collection_id=COL_MECHANICS,
        document_id=mechanic_id,
        data={"staffrole": payload.staffrole},
    )

    full_name = f"{updated.get('first_name', '')} {updated.get('last_name', '')}".strip()
    return MechanicResponse(
        id=updated["$id"],
        first_name=updated.get("first_name", ""),
        last_name=updated.get("last_name", ""),
        email=updated.get("email", ""),
        shop_id=updated.get("shop_id", ""),
        active_status=updated.get("active_status", False),
        full_name=full_name or None,
        staffrole=updated.get("staffrole", "technician"),
        permitted_modules=updated.get("permitted_modules", []),
        can_push_global_db=updated.get("can_push_global_db", False),
    )


class MechanicModulesUpdate(BaseModel):
    permitted_modules: List[str]


@router.patch("/mechanics/{mechanic_id}/modules", response_model=MechanicResponse)
def update_mechanic_modules(
    mechanic_id: str,
    payload: MechanicModulesUpdate,
    current_admin: dict = Depends(get_current_shop_admin),
):
    """Change a mechanic's permitted modules."""
    try:
        doc = databases.get_document(DB_ID, COL_MECHANICS, mechanic_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Mechanic not found.")

    if doc.get("shop_id") != current_admin.get("shop_id"):
        raise HTTPException(status_code=403, detail="You can only manage mechanics in your own shop.")

    updated = databases.update_document(
        database_id=DB_ID,
        collection_id=COL_MECHANICS,
        document_id=mechanic_id,
        data={"permitted_modules": payload.permitted_modules},
    )

    full_name = f"{updated.get('first_name', '')} {updated.get('last_name', '')}".strip()
    return MechanicResponse(
        id=updated["$id"],
        first_name=updated.get("first_name", ""),
        last_name=updated.get("last_name", ""),
        email=updated.get("email", ""),
        shop_id=updated.get("shop_id", ""),
        active_status=updated.get("active_status", False),
        full_name=full_name or None,
        staffrole=updated.get("staffrole", "technician"),
        permitted_modules=updated.get("permitted_modules", []),
        can_push_global_db=updated.get("can_push_global_db", False),
    )


class GlobalDbPushUpdate(BaseModel):
    can_push_global_db: bool


@router.patch("/mechanics/{mechanic_id}/global-db-push", response_model=MechanicResponse)
def update_mechanic_global_db_push(
    mechanic_id: str,
    payload: GlobalDbPushUpdate,
    current_admin: dict = Depends(get_current_shop_admin),
):
    """Change a mechanic's global db push permission."""
    try:
        doc = databases.get_document(DB_ID, COL_MECHANICS, mechanic_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Mechanic not found.")

    if doc.get("shop_id") != current_admin.get("shop_id"):
        raise HTTPException(status_code=403, detail="You can only manage mechanics in your own shop.")

    updated = databases.update_document(
        database_id=DB_ID,
        collection_id=COL_MECHANICS,
        document_id=mechanic_id,
        data={"can_push_global_db": payload.can_push_global_db},
    )

    full_name = f"{updated.get('first_name', '')} {updated.get('last_name', '')}".strip()
    return MechanicResponse(
        id=updated["$id"],
        first_name=updated.get("first_name", ""),
        last_name=updated.get("last_name", ""),
        email=updated.get("email", ""),
        shop_id=updated.get("shop_id", ""),
        active_status=updated.get("active_status", False),
        full_name=full_name or None,
        staffrole=updated.get("staffrole", "technician"),
        permitted_modules=updated.get("permitted_modules", []),
        can_push_global_db=updated.get("can_push_global_db", False),
    )


@router.delete("/mechanics/{mechanic_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mechanic(
    mechanic_id: str,
    current_admin: dict = Depends(get_current_shop_admin),
):
    """Remove a mechanic from the current shop."""
    try:
        doc = databases.get_document(DB_ID, COL_MECHANICS, mechanic_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Mechanic not found.")

    if doc.get("shop_id") != current_admin.get("shop_id"):
        raise HTTPException(status_code=403, detail="You can only delete mechanics in your own shop.")

    databases.delete_document(
        database_id=DB_ID,
        collection_id=COL_MECHANICS,
        document_id=mechanic_id,
    )

    return {"detail": "Deleted"}


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.patch("/{shop_id}/password", status_code=status.HTTP_200_OK)
def change_shop_password(
    shop_id: str,
    payload: PasswordChange,
    current_admin: dict = Depends(get_current_shop_admin),
):
    """Change the password for the current shop admin."""
    if current_admin.get("shop_id") != shop_id:
        raise HTTPException(status_code=403, detail="You can only change your own shop's password.")

    try:
        doc = databases.get_document(DB_ID, COL_SHOP, shop_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Shop not found.")

    if not verify_password(payload.current_password, doc["hashed_password"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")

    databases.update_document(
        database_id=DB_ID,
        collection_id=COL_SHOP,
        document_id=shop_id,
        data={"hashed_password": get_password_hash(payload.new_password)},
    )
    return {"detail": "Password updated successfully."}


class ModuleGroupCreate(BaseModel):
    name: str
    desc: str
    icon: str
    module_ids: List[str]
    price_monthly: int
    price_yearly: int


@router.get("/{shop_id}/module-groups")
def get_module_groups(
    shop_id: str,
    current_user: dict = Depends(get_current_shop_user),
):
    """Get all prebuilt module groups and custom groups for this shop."""
    try:
        # Fetch prebuilt groups
        prebuilt = databases.list_documents(
            database_id=DB_ID,
            collection_id=COL_MODULE_GROUPS,
            queries=[Query.equal("shop_id", "pr3bu1lt"), Query.limit(100)]
        )
        
        # Fetch custom groups for this shop
        custom = databases.list_documents(
            database_id=DB_ID,
            collection_id=COL_MODULE_GROUPS,
            queries=[Query.equal("shop_id", shop_id), Query.limit(100)]
        )
        
        docs = prebuilt.get("documents", []) + custom.get("documents", [])
        
        return [{
            "id": d["$id"],
            "name": d["name"],
            "desc": d.get("desc", ""),
            "icon": d.get("icon", "📦"),
            "moduleIds": d["module_ids"],
            "price": {
                "monthly": d["price_monthly"],
                "yearly": d["price_yearly"],
            },
            "shop_id": d["shop_id"],
        } for d in docs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{shop_id}/module-groups", status_code=status.HTTP_201_CREATED)
def create_module_group(
    shop_id: str,
    payload: ModuleGroupCreate,
    current_admin: dict = Depends(get_current_shop_admin),
):
    """Create a new custom module group for this shop."""
    if current_admin.get("shop_id") != shop_id:
        raise HTTPException(status_code=403, detail="You can only create groups for your own shop.")
        
    try:
        doc_id = ID.unique()
        doc = databases.create_document(
            database_id=DB_ID,
            collection_id=COL_MODULE_GROUPS,
            document_id=doc_id,
            data={
                "name": payload.name,
                "desc": payload.desc,
                "icon": payload.icon,
                "module_ids": payload.module_ids,
                "price_monthly": payload.price_monthly,
                "price_yearly": payload.price_yearly,
                "shop_id": shop_id,
            }
        )
        return {
            "id": doc["$id"],
            "name": doc["name"],
            "desc": doc.get("desc", ""),
            "icon": doc.get("icon", "📦"),
            "moduleIds": doc["module_ids"],
            "price": {
                "monthly": doc["price_monthly"],
                "yearly": doc["price_yearly"],
            },
            "shop_id": doc["shop_id"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

