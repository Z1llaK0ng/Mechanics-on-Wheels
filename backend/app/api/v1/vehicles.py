import re
from typing import List, Optional

from appwrite.id import ID
from appwrite.query import Query
from fastapi import APIRouter, Depends, HTTPException, status, Query as QParam

from app.core.appwrite_client import databases, DB_ID, COL_VEHICLES
from app.core.security import get_current_user
from app.schemas.vehicle import (
    VehicleCreate, VehicleUpdate, VehicleResponse,
    VehicleIdentifyRequest, VehicleIdentifyResponse
)

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


def _doc_to_response(doc: dict) -> VehicleResponse:
    return VehicleResponse(
        registry=doc["registry"],
        vin=doc["vin"],
        company=doc.get("company", ""),
        brand=doc.get("brand", ""),
        active_status=doc.get("active_status", True),
        owner_id=doc.get("owner_id"),
        # Aliases the frontend uses
        make=doc.get("company"),
        model=doc.get("brand"),
    )


@router.post("/identify", response_model=VehicleIdentifyResponse)
def identify_vehicle(
    request: VehicleIdentifyRequest,
    current_user: dict = Depends(get_current_user)
):
    """Identify a vehicle by VIN or license plate."""
    identifier = request.identifier.strip().upper()

    # Try VIN first
    result = databases.list_documents(
        database_id=DB_ID,
        collection_id=COL_VEHICLES,
        queries=[Query.equal("vin", identifier)]
    )
    docs = result.get("documents", [])

    # Try registry
    if not docs:
        result = databases.list_documents(
            database_id=DB_ID,
            collection_id=COL_VEHICLES,
            queries=[Query.equal("registry", identifier)]
        )
        docs = result.get("documents", [])

    if not docs:
        raise HTTPException(status_code=404, detail="Vehicle not found with the provided identifier")

    return _doc_to_response(docs[0])


@router.get("", response_model=List[VehicleResponse])
def list_vehicles(
    limit: int = QParam(100, le=100),
    company: Optional[str] = None,
    active_only: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """List all vehicles with optional filters."""
    queries = [Query.limit(limit)]
    if active_only:
        queries.append(Query.equal("active_status", True))
    if company:
        queries.append(Query.search("company", company))

    result = databases.list_documents(
        database_id=DB_ID,
        collection_id=COL_VEHICLES,
        queries=queries
    )
    return [_doc_to_response(d) for d in result.get("documents", [])]


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def register_vehicle(
    vehicle_data: VehicleCreate,
    current_user: dict = Depends(get_current_user)
):
    """Register a new vehicle."""
    # Check VIN uniqueness
    vin_check = databases.list_documents(
        DB_ID, COL_VEHICLES, [Query.equal("vin", vehicle_data.vin)]
    )
    reg_check = databases.list_documents(
        DB_ID, COL_VEHICLES, [Query.equal("registry", vehicle_data.registry)]
    )
    if vin_check.get("total", 0) > 0 or reg_check.get("total", 0) > 0:
        raise HTTPException(status_code=400, detail="Vehicle with this VIN or registry already exists")

    doc = databases.create_document(
        database_id=DB_ID,
        collection_id=COL_VEHICLES,
        document_id=ID.unique(),
        data={
            "registry": vehicle_data.registry,
            "vin": vehicle_data.vin,
            "company": vehicle_data.company,
            "brand": vehicle_data.brand,
            "active_status": True,
            "owner_id": vehicle_data.owner_id,
        }
    )
    return _doc_to_response(doc)


@router.get("/{registry}", response_model=VehicleResponse)
def get_vehicle(
    registry: str,
    current_user: dict = Depends(get_current_user)
):
    """Get vehicle by license plate."""
    result = databases.list_documents(
        DB_ID, COL_VEHICLES, [Query.equal("registry", registry)]
    )
    docs = result.get("documents", [])
    if not docs:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return _doc_to_response(docs[0])


@router.put("/{registry}", response_model=VehicleResponse)
def update_vehicle(
    registry: str,
    vehicle_update: VehicleUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update vehicle information."""
    result = databases.list_documents(
        DB_ID, COL_VEHICLES, [Query.equal("registry", registry)]
    )
    docs = result.get("documents", [])
    if not docs:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    data = {k: v for k, v in vehicle_update.model_dump().items() if v is not None}
    doc = databases.update_document(DB_ID, COL_VEHICLES, docs[0]["$id"], data)
    return _doc_to_response(doc)


@router.delete("/{registry}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_vehicle(
    registry: str,
    current_user: dict = Depends(get_current_user)
):
    """Soft-delete a vehicle (set active_status=False)."""
    result = databases.list_documents(
        DB_ID, COL_VEHICLES, [Query.equal("registry", registry)]
    )
    docs = result.get("documents", [])
    if not docs:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    databases.update_document(DB_ID, COL_VEHICLES, docs[0]["$id"], {"active_status": False})
    return None
