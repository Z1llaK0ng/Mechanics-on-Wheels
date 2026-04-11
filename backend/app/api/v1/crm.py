"""
CRM Router — Customer Relationship Management
==============================================
Endpoints for managing vehicle owners (customers), associating vehicles with
owners, linking job-cards to customers through vehicles, and notifying customers
when job cards are completed.

All routes require a valid shop token (admin OR staff).
"""
from typing import List, Optional

from appwrite.id import ID
from appwrite.query import Query
from fastapi import APIRouter, Depends, HTTPException, status, Query as QParam

from app.core.appwrite_client import (
    databases, DB_ID,
    COL_VEHICLE_OWNERS, COL_VEHICLES, COL_JOB_CARDS,
)
from app.core.shop_security import get_current_shop_user
from app.schemas.customer import (
    CustomerCreate, CustomerUpdate,
    CustomerResponse, CustomerDetailResponse,
    VehicleOwnerAssign, NotifyRequest, NotifyResponse,
)
from app.schemas.vehicle import VehicleCreate, VehicleResponse, VehicleUpdate

router = APIRouter(prefix="/crm", tags=["CRM"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _owner_to_response(doc: dict, vehicle_count: int = 0) -> CustomerResponse:
    return CustomerResponse(
        id=doc["$id"],
        name=doc["name"],
        phone=doc.get("phone"),
        email=doc.get("email"),
        shop_id=doc.get("shop_id"),
        vehicle_count=vehicle_count,
    )


def _vehicle_to_response(doc: dict) -> VehicleResponse:
    return VehicleResponse(
        registry=doc["registry"],
        vin=doc["vin"],
        company=doc.get("company", ""),
        brand=doc.get("brand", ""),
        active_status=doc.get("active_status", True),
        owner_id=doc.get("owner_id"),
        make=doc.get("company"),
        model=doc.get("brand"),
    )


def _require_own_shop(current_user: dict, shop_id: str):
    if current_user.get("shop_id") != shop_id:
        raise HTTPException(status_code=403, detail="You can only access your own shop's CRM data.")


# ═══════════════════════════════════════════════════════════════════════════════
# CUSTOMER (vehicle_owners) ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/customers", response_model=List[CustomerResponse])
def list_customers(
    limit: int = QParam(100, le=200),
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_shop_user),
):
    """List all vehicle owners belonging to the current shop."""
    shop_id = current_user.get("shop_id", "")
    queries = [Query.equal("shop_id", shop_id), Query.limit(limit)]
    if search:
        queries.append(Query.search("name", search))

    result = databases.list_documents(DB_ID, COL_VEHICLE_OWNERS, queries=queries)
    owners = result["documents"]

    if not owners:
        return []

    # Batch-count vehicles per owner
    owner_ids = [o["$id"] for o in owners]
    try:
        veh_result = databases.list_documents(
            DB_ID, COL_VEHICLES,
            queries=[Query.equal("owner_id", owner_ids), Query.limit(500)]
        )
        count_map: dict = {}
        for v in veh_result["documents"]:
            oid = v.get("owner_id")
            if oid:
                count_map[oid] = count_map.get(oid, 0) + 1
    except Exception:
        count_map = {}

    return [_owner_to_response(o, count_map.get(o["$id"], 0)) for o in owners]


@router.post("/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    current_user: dict = Depends(get_current_shop_user),
):
    """Create a new vehicle owner / customer for the current shop."""
    shop_id = current_user.get("shop_id", "")

    doc = databases.create_document(
        database_id=DB_ID,
        collection_id=COL_VEHICLE_OWNERS,
        document_id=ID.unique(),
        data={
            "name": payload.name,
            "phone": payload.phone or "",
            "email": payload.email or "",
            "shop_id": shop_id,
        },
    )
    return _owner_to_response(doc)


@router.get("/customers/{owner_id}", response_model=CustomerDetailResponse)
def get_customer(
    owner_id: str,
    current_user: dict = Depends(get_current_shop_user),
):
    """Get a customer with their linked vehicles."""
    try:
        doc = databases.get_document(DB_ID, COL_VEHICLE_OWNERS, owner_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Customer not found.")

    shop_id = current_user.get("shop_id", "")
    # Allow if owned by this shop OR has no shop_id (legacy)
    if doc.get("shop_id") and doc.get("shop_id") != shop_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    veh_result = databases.list_documents(
        DB_ID, COL_VEHICLES,
        queries=[Query.equal("owner_id", owner_id), Query.limit(200)]
    )
    vehicles = [_vehicle_to_response(v) for v in veh_result["documents"]]

    return CustomerDetailResponse(
        id=doc["$id"],
        name=doc["name"],
        phone=doc.get("phone"),
        email=doc.get("email"),
        shop_id=doc.get("shop_id"),
        vehicle_count=len(vehicles),
        vehicles=vehicles,
    )


@router.patch("/customers/{owner_id}", response_model=CustomerResponse)
def update_customer(
    owner_id: str,
    payload: CustomerUpdate,
    current_user: dict = Depends(get_current_shop_user),
):
    """Update customer info (name, phone, email)."""
    try:
        doc = databases.get_document(DB_ID, COL_VEHICLE_OWNERS, owner_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Customer not found.")

    shop_id = current_user.get("shop_id", "")
    if doc.get("shop_id") and doc.get("shop_id") != shop_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not data:
        return _owner_to_response(doc)

    updated = databases.update_document(DB_ID, COL_VEHICLE_OWNERS, owner_id, data)
    return _owner_to_response(updated)


@router.delete("/customers/{owner_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    owner_id: str,
    current_user: dict = Depends(get_current_shop_user),
):
    """Remove a customer. Their vehicles are unlinked (owner_id cleared), not deleted."""
    try:
        doc = databases.get_document(DB_ID, COL_VEHICLE_OWNERS, owner_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Customer not found.")

    shop_id = current_user.get("shop_id", "")
    if doc.get("shop_id") and doc.get("shop_id") != shop_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Unlink all vehicles belonging to this owner
    try:
        veh_result = databases.list_documents(
            DB_ID, COL_VEHICLES,
            queries=[Query.equal("owner_id", owner_id), Query.limit(500)]
        )
        for v in veh_result["documents"]:
            databases.update_document(DB_ID, COL_VEHICLES, v["$id"], {"owner_id": None})
    except Exception:
        pass

    databases.delete_document(DB_ID, COL_VEHICLE_OWNERS, owner_id)
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# CRM VEHICLE ENDPOINTS (shop-scoped wrappers)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/vehicles", response_model=List[VehicleResponse])
def list_crm_vehicles(
    limit: int = QParam(100, le=200),
    owner_id: Optional[str] = None,
    active_only: bool = True,
    current_user: dict = Depends(get_current_shop_user),
):
    """
    List vehicles relevant to this shop.
    If owner_id is given, returns only that owner's vehicles.
    Otherwise returns all vehicles that have a job card for this shop.
    """
    shop_id = current_user.get("shop_id", "")

    if owner_id:
        queries = [Query.equal("owner_id", owner_id), Query.limit(limit)]
        if active_only:
            queries.append(Query.equal("active_status", True))
        result = databases.list_documents(DB_ID, COL_VEHICLES, queries=queries)
        return [_vehicle_to_response(v) for v in result["documents"]]

    # Get all registries from job cards for this shop
    try:
        jc_result = databases.list_documents(
            DB_ID, COL_JOB_CARDS,
            queries=[Query.equal("shop_id", shop_id), Query.limit(500)]
        )
        registries = list({jc["vehicle_registry"] for jc in jc_result["documents"] if jc.get("vehicle_registry")})
    except Exception:
        registries = []

    if not registries:
        return []

    # Fetch those vehicles
    queries = [Query.equal("registry", registries), Query.limit(limit)]
    if active_only:
        queries.append(Query.equal("active_status", True))
    result = databases.list_documents(DB_ID, COL_VEHICLES, queries=queries)
    return [_vehicle_to_response(v) for v in result["documents"]]


@router.post("/vehicles", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def register_crm_vehicle(
    payload: VehicleCreate,
    current_user: dict = Depends(get_current_shop_user),
):
    """Register a new vehicle (CRM-scoped, same as /vehicles but accessible to CRM users)."""
    # Check uniqueness
    vin_check = databases.list_documents(DB_ID, COL_VEHICLES, [Query.equal("vin", payload.vin)])
    reg_check = databases.list_documents(DB_ID, COL_VEHICLES, [Query.equal("registry", payload.registry)])
    if vin_check["total"] > 0 or reg_check["total"] > 0:
        raise HTTPException(status_code=400, detail="Vehicle with this VIN or registry already exists.")

    doc = databases.create_document(
        database_id=DB_ID,
        collection_id=COL_VEHICLES,
        document_id=ID.unique(),
        data={
            "registry": payload.registry,
            "vin": payload.vin,
            "company": payload.company,
            "brand": payload.brand,
            "active_status": True,
            "owner_id": payload.owner_id or "",
        },
    )
    return _vehicle_to_response(doc)


@router.patch("/vehicles/{registry}/owner", response_model=VehicleResponse)
def assign_vehicle_owner(
    registry: str,
    payload: VehicleOwnerAssign,
    current_user: dict = Depends(get_current_shop_user),
):
    """Assign or change (or clear) the owner of a vehicle."""
    result = databases.list_documents(DB_ID, COL_VEHICLES, [Query.equal("registry", registry)])
    docs = result["documents"]
    if not docs:
        raise HTTPException(status_code=404, detail="Vehicle not found.")

    # Validate owner exists if one is given
    if payload.owner_id:
        try:
            databases.get_document(DB_ID, COL_VEHICLE_OWNERS, payload.owner_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Owner not found.")

    updated = databases.update_document(
        DB_ID, COL_VEHICLES, docs[0]["$id"],
        {"owner_id": payload.owner_id or ""},
    )
    return _vehicle_to_response(updated)


# ═══════════════════════════════════════════════════════════════════════════════
# JOB CARD LINKAGE
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/customers/{owner_id}/job-cards")
def get_customer_job_cards(
    owner_id: str,
    current_user: dict = Depends(get_current_shop_user),
):
    """Return all job cards for every vehicle owned by this customer (shop-scoped)."""
    shop_id = current_user.get("shop_id", "")
    try:
        databases.get_document(DB_ID, COL_VEHICLE_OWNERS, owner_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Customer not found.")

    # Get the customer's vehicles
    veh_result = databases.list_documents(
        DB_ID, COL_VEHICLES,
        queries=[Query.equal("owner_id", owner_id), Query.limit(200)]
    )
    registries = [v["registry"] for v in veh_result["documents"]]

    if not registries:
        return []

    # Fetch job cards for those vehicles in this shop
    jc_result = databases.list_documents(
        DB_ID, COL_JOB_CARDS,
        queries=[
            Query.equal("vehicle_registry", registries),
            Query.equal("shop_id", shop_id),
            Query.limit(500),
        ],
    )
    return jc_result["documents"]


# ═══════════════════════════════════════════════════════════════════════════════
# NOTIFICATION
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/customers/{owner_id}/notify", response_model=NotifyResponse)
def notify_customer(
    owner_id: str,
    payload: NotifyRequest,
    current_user: dict = Depends(get_current_shop_user),
):
    """
    Prepare a notification for a customer about a completed job card.
    Phase 1: Returns the customer's contact info + a formatted message so
    staff can reach out manually. No email service is invoked yet.
    """
    try:
        owner = databases.get_document(DB_ID, COL_VEHICLE_OWNERS, owner_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Customer not found.")

    try:
        jc = databases.get_document(DB_ID, COL_JOB_CARDS, payload.job_card_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job card not found.")

    if jc.get("status") != "completed":
        raise HTTPException(
            status_code=400,
            detail="Job card is not completed yet. Only completed job cards can trigger a notification.",
        )

    custom_msg = payload.message or (
        f"Dear {owner['name']}, your vehicle ({jc.get('vehicle_registry', '')}) "
        "has been serviced and is ready for pick-up. Thank you for choosing our workshop."
    )

    return NotifyResponse(
        customer_name=owner["name"],
        customer_email=owner.get("email") or None,
        customer_phone=owner.get("phone") or None,
        job_card_id=payload.job_card_id,
        vehicle_registry=jc.get("vehicle_registry", ""),
        status=jc.get("status", ""),
        message=custom_msg,
    )
