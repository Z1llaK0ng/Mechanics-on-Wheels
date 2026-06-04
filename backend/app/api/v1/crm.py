"""
CRM Router — Customer Relationship Management
==============================================
Uses a many-to-many junction table (shop_customers) so that the same
vehicle_owner can be linked to multiple shops.  Each shop sees only its
own linked customers, but a single customer profile is shared.

All routes require a valid shop token (admin OR staff).
"""
from typing import List, Optional

from appwrite.id import ID
from appwrite.query import Query
from fastapi import APIRouter, Depends, HTTPException, status, Query as QParam

from app.core.appwrite_client import (
    databases, DB_ID,
    COL_VEHICLE_OWNERS, COL_VEHICLES, COL_JOB_CARDS,
    COL_SHOP_CUSTOMERS,
)
from app.core.shop_security import get_current_shop_user
from app.schemas.customer import (
    CustomerCreate, CustomerUpdate,
    CustomerResponse, CustomerDetailResponse,
    VehicleOwnerAssign, NotifyRequest, NotifyResponse,
)
from app.schemas.vehicle import VehicleCreate, VehicleResponse

router = APIRouter(prefix="/crm", tags=["CRM"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _owner_to_response(doc: dict, vehicle_count: int = 0) -> CustomerResponse:
    return CustomerResponse(
        id=doc["$id"],
        name=doc["name"],
        phone=doc.get("phone"),
        email=doc.get("email"),
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


def _get_shop_customer_ids(shop_id: str) -> List[str]:
    """Return all vehicle_owner IDs linked to this shop via shop_customers."""
    result = databases.list_documents(
        DB_ID, COL_SHOP_CUSTOMERS,
        queries=[Query.equal("shop_id", shop_id), Query.limit(500)],
    )
    return [doc["customer_id"] for doc in result["documents"]]


def _link_exists(shop_id: str, customer_id: str) -> bool:
    """Return True if a shop_customers link already exists."""
    result = databases.list_documents(
        DB_ID, COL_SHOP_CUSTOMERS,
        queries=[
            Query.equal("shop_id", shop_id),
            Query.equal("customer_id", customer_id),
            Query.limit(1),
        ],
    )
    return result["total"] > 0


def _create_link(shop_id: str, customer_id: str):
    """Create a shop_customers junction record (idempotent)."""
    if not _link_exists(shop_id, customer_id):
        databases.create_document(
            database_id=DB_ID,
            collection_id=COL_SHOP_CUSTOMERS,
            document_id=ID.unique(),
            data={"shop_id": shop_id, "customer_id": customer_id},
        )


def _delete_link(shop_id: str, customer_id: str):
    """Remove the junction record that ties this customer to this shop."""
    result = databases.list_documents(
        DB_ID, COL_SHOP_CUSTOMERS,
        queries=[
            Query.equal("shop_id", shop_id),
            Query.equal("customer_id", customer_id),
            Query.limit(5),
        ],
    )
    for doc in result["documents"]:
        databases.delete_document(DB_ID, COL_SHOP_CUSTOMERS, doc["$id"])


# ═══════════════════════════════════════════════════════════════════════════════
# CUSTOMER (vehicle_owners) ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/customers", response_model=List[CustomerResponse])
def list_customers(
    limit: int = QParam(200, le=500),
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_shop_user),
):
    """
    List all vehicle owners linked to the current shop via the shop_customers
    junction table.
    """
    shop_id = current_user.get("shop_id", "")
    customer_ids = _get_shop_customer_ids(shop_id)

    if not customer_ids:
        return []

    # Fetch the actual vehicle_owner documents
    queries = [Query.equal("$id", customer_ids), Query.limit(limit)]
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
            queries=[Query.equal("owner_id", owner_ids), Query.limit(500)],
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
    """
    Create a brand-new vehicle owner and immediately link them to the
    current shop via the shop_customers junction table.
    """
    shop_id = current_user.get("shop_id", "")

    doc = databases.create_document(
        database_id=DB_ID,
        collection_id=COL_VEHICLE_OWNERS,
        document_id=ID.unique(),
        data={
            "name":  payload.name,
            "phone": payload.phone or "",
            "email": payload.email or "",
        },
    )

    # Create the junction record
    _create_link(shop_id, doc["$id"])

    return _owner_to_response(doc)


@router.post("/customers/link", response_model=CustomerResponse)
def link_existing_customer(
    customer_id: str,
    current_user: dict = Depends(get_current_shop_user),
):
    """
    Link an already-existing vehicle_owner to the current shop.
    Useful when a customer visits a second shop that is also on the network.
    Returns 409 if already linked.
    """
    shop_id = current_user.get("shop_id", "")

    # Verify customer exists
    try:
        doc = databases.get_document(DB_ID, COL_VEHICLE_OWNERS, customer_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Customer not found.")

    if _link_exists(shop_id, customer_id):
        raise HTTPException(status_code=409, detail="Customer is already linked to this shop.")

    _create_link(shop_id, customer_id)

    # Count their vehicles for the response
    veh_result = databases.list_documents(
        DB_ID, COL_VEHICLES,
        queries=[Query.equal("owner_id", customer_id), Query.limit(200)],
    )
    return _owner_to_response(doc, len(veh_result["documents"]))


@router.get("/customers/search-global", response_model=List[CustomerResponse])
def search_global_customers(
    q: str,
    limit: int = QParam(20, le=50),
    current_user: dict = Depends(get_current_shop_user),
):
    """
    Search ALL vehicle_owners across the network by name (for the Link flow).
    Allows a shop to find and link an existing customer without duplicating them.
    """
    if not q or len(q) < 2:
        return []

    result = databases.list_documents(
        DB_ID, COL_VEHICLE_OWNERS,
        queries=[Query.search("name", q), Query.limit(limit)],
    )
    owners = result["documents"]
    if not owners:
        return []

    # Batch vehicle counts
    ids = [o["$id"] for o in owners]
    try:
        veh_result = databases.list_documents(
            DB_ID, COL_VEHICLES,
            queries=[Query.equal("owner_id", ids), Query.limit(300)],
        )
        count_map: dict = {}
        for v in veh_result["documents"]:
            oid = v.get("owner_id")
            if oid:
                count_map[oid] = count_map.get(oid, 0) + 1
    except Exception:
        count_map = {}

    return [_owner_to_response(o, count_map.get(o["$id"], 0)) for o in owners]


@router.get("/customers/{owner_id}", response_model=CustomerDetailResponse)
def get_customer(
    owner_id: str,
    current_user: dict = Depends(get_current_shop_user),
):
    """Get a customer's profile + their linked vehicles. 403s if customer not linked to this shop."""
    shop_id = current_user.get("shop_id", "")

    if not _link_exists(shop_id, owner_id):
        raise HTTPException(status_code=403, detail="This customer is not linked to your shop.")

    try:
        doc = databases.get_document(DB_ID, COL_VEHICLE_OWNERS, owner_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Customer not found.")

    veh_result = databases.list_documents(
        DB_ID, COL_VEHICLES,
        queries=[Query.equal("owner_id", owner_id), Query.limit(200)],
    )
    vehicles = [_vehicle_to_response(v) for v in veh_result["documents"]]

    return CustomerDetailResponse(
        id=doc["$id"],
        name=doc["name"],
        phone=doc.get("phone"),
        email=doc.get("email"),
        shop_id=None,
        vehicle_count=len(vehicles),
        vehicles=vehicles,
    )


@router.patch("/customers/{owner_id}", response_model=CustomerResponse)
def update_customer(
    owner_id: str,
    payload: CustomerUpdate,
    current_user: dict = Depends(get_current_shop_user),
):
    """Update customer info. Allowed only if this shop has the customer linked."""
    shop_id = current_user.get("shop_id", "")

    if not _link_exists(shop_id, owner_id):
        raise HTTPException(status_code=403, detail="This customer is not linked to your shop.")

    try:
        doc = databases.get_document(DB_ID, COL_VEHICLE_OWNERS, owner_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Customer not found.")

    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not data:
        return _owner_to_response(doc)

    updated = databases.update_document(DB_ID, COL_VEHICLE_OWNERS, owner_id, data)
    return _owner_to_response(updated)


@router.delete("/customers/{owner_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlink_customer(
    owner_id: str,
    current_user: dict = Depends(get_current_shop_user),
):
    """
    Unlink a customer from this shop (removes the junction row).
    The vehicle_owner document itself is NOT deleted — the customer may
    still be linked to other shops.
    """
    shop_id = current_user.get("shop_id", "")

    if not _link_exists(shop_id, owner_id):
        raise HTTPException(status_code=404, detail="Customer is not linked to this shop.")

    _delete_link(shop_id, owner_id)
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# CRM VEHICLE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/vehicles", response_model=List[VehicleResponse])
def list_crm_vehicles(
    limit: int = QParam(200, le=500),
    owner_id: Optional[str] = None,
    active_only: bool = True,
    current_user: dict = Depends(get_current_shop_user),
):
    """
    List vehicles relevant to the current shop.
    - If owner_id given → only that owner's vehicles.
    - Otherwise → all vehicles linked to customers of this shop, plus any
      vehicle that has a job card belonging to this shop.
    """
    shop_id = current_user.get("shop_id", "")

    if owner_id:
        queries = [Query.equal("owner_id", owner_id), Query.limit(limit)]
        if active_only:
            queries.append(Query.equal("active_status", True))
        result = databases.list_documents(DB_ID, COL_VEHICLES, queries=queries)
        return [_vehicle_to_response(v) for v in result["documents"]]

    # Gather owner IDs linked to this shop
    customer_ids = _get_shop_customer_ids(shop_id)

    # Gather registries from job cards
    try:
        jc_result = databases.list_documents(
            DB_ID, COL_JOB_CARDS,
            queries=[Query.equal("shop_id", shop_id), Query.limit(500)],
        )
        jc_registries = list({jc["vehicle_registry"] for jc in jc_result["documents"] if jc.get("vehicle_registry")})
    except Exception:
        jc_registries = []

    # Fetch by owner
    vehicles: dict = {}   # registry → doc
    if customer_ids:
        veh_result = databases.list_documents(
            DB_ID, COL_VEHICLES,
            queries=[Query.equal("owner_id", customer_ids), Query.limit(limit)],
        )
        for v in veh_result["documents"]:
            vehicles[v["registry"]] = v

    # Fetch by job-card registries (may include unowned vehicles)
    if jc_registries:
        remaining = [r for r in jc_registries if r not in vehicles]
        if remaining:
            veh_result2 = databases.list_documents(
                DB_ID, COL_VEHICLES,
                queries=[Query.equal("registry", remaining), Query.limit(limit)],
            )
            for v in veh_result2["documents"]:
                vehicles[v["registry"]] = v

    result_list = list(vehicles.values())
    if active_only:
        result_list = [v for v in result_list if v.get("active_status", True)]

    return [_vehicle_to_response(v) for v in result_list]


@router.post("/vehicles", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def register_crm_vehicle(
    payload: VehicleCreate,
    current_user: dict = Depends(get_current_shop_user),
):
    """Register a new vehicle and optionally assign it to a customer."""
    vin_check = databases.list_documents(DB_ID, COL_VEHICLES, [Query.equal("vin", payload.vin)])
    reg_check = databases.list_documents(DB_ID, COL_VEHICLES, [Query.equal("registry", payload.registry)])
    if vin_check["total"] > 0 or reg_check["total"] > 0:
        raise HTTPException(status_code=400, detail="Vehicle with this VIN or registry already exists.")

    doc = databases.create_document(
        database_id=DB_ID,
        collection_id=COL_VEHICLES,
        document_id=ID.unique(),
        data={
            "registry":      payload.registry,
            "vin":           payload.vin,
            "company":       payload.company,
            "brand":         payload.brand,
            "active_status": True,
            "owner_id":      payload.owner_id or "",
        },
    )
    return _vehicle_to_response(doc)


@router.patch("/vehicles/{registry}/owner", response_model=VehicleResponse)
def assign_vehicle_owner(
    registry: str,
    payload: VehicleOwnerAssign,
    current_user: dict = Depends(get_current_shop_user),
):
    """Assign, change, or clear the owner of a vehicle. Auto-creates vehicle if missing."""
    shop_id = current_user.get("shop_id", "")
    result = databases.list_documents(DB_ID, COL_VEHICLES, [Query.equal("registry", registry)])
    docs = result["documents"]

    if payload.owner_id:
        try:
            databases.get_document(DB_ID, COL_VEHICLE_OWNERS, payload.owner_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Owner not found.")

    if not docs:
        # Check if there is a job card for this registry
        jc_check = databases.list_documents(
            DB_ID, COL_JOB_CARDS,
            [Query.equal("vehicle_registry", registry), Query.equal("shop_id", shop_id)]
        )
        if jc_check["total"] == 0:
            raise HTTPException(status_code=404, detail="Vehicle not found in shop records.")
        
        # Pull VIN from job card if available
        vin = jc_check["documents"][0].get("vehicle_vin", "—")
        
        # Auto-create vehicle linking it to owner
        doc = databases.create_document(
            database_id=DB_ID,
            collection_id=COL_VEHICLES,
            document_id=ID.unique(),
            data={
                "registry": registry,
                "vin": vin,
                "company": "—",
                "brand": "—",
                "active_status": True,
                "owner_id": payload.owner_id or ""
            }
        )
        return _vehicle_to_response(doc)

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
    """All job cards for every vehicle owned by this customer (shop-scoped)."""
    shop_id = current_user.get("shop_id", "")

    if not _link_exists(shop_id, owner_id):
        raise HTTPException(status_code=403, detail="This customer is not linked to your shop.")

    veh_result = databases.list_documents(
        DB_ID, COL_VEHICLES,
        queries=[Query.equal("owner_id", owner_id), Query.limit(200)],
    )
    registries = [v["registry"] for v in veh_result["documents"]]
    if not registries:
        return []

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
    Prepare a ready-to-send notification for the customer.
    Phase 1: returns contact info + formatted message — no email is sent.
    """
    shop_id = current_user.get("shop_id", "")

    if not _link_exists(shop_id, owner_id):
        raise HTTPException(status_code=403, detail="This customer is not linked to your shop.")

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

    msg = payload.message or (
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
        message=msg,
    )
