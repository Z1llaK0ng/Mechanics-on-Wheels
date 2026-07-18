import re
from typing import List, Optional

from appwrite.id import ID
from appwrite.query import Query
from fastapi import APIRouter, Depends, HTTPException, status, Query as QParam

from app.core.appwrite_client import databases, DB_ID, COL_VEHICLES, COL_JOB_CARDS
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
        past_registry_num=doc.get("past_registry_num", []),
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
    docs = result["documents"]

    # Try registry
    if not docs:
        result = databases.list_documents(
            database_id=DB_ID,
            collection_id=COL_VEHICLES,
            queries=[Query.equal("registry", identifier)]
        )
        docs = result["documents"]

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
    return [_doc_to_response(d) for d in result["documents"]]


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
    if vin_check["total"] > 0 or reg_check["total"] > 0:
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
            "past_registry_num": [],
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
    docs = result["documents"]
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
    docs = result["documents"]
    if not docs:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    data = {k: v for k, v in vehicle_update.model_dump().items() if v is not None}
    
    old_registry = docs[0]["registry"]
    new_registry = data.get("registry")
    vin = docs[0]["vin"]
    
    if new_registry and new_registry != old_registry:
        new_registry = new_registry.strip().upper()
        data["registry"] = new_registry
        
        # Check uniqueness of new registry
        reg_check = databases.list_documents(
            DB_ID, COL_VEHICLES, [Query.equal("registry", new_registry)]
        )
        if reg_check["total"] > 0:
            raise HTTPException(status_code=400, detail="Vehicle with this registry already exists")
            
        # Update past_registry_num list
        past_list = docs[0].get("past_registry_num") or []
        past_list = list(past_list)
        if old_registry not in past_list:
            past_list.append(old_registry)
        data["past_registry_num"] = past_list

    doc = databases.update_document(DB_ID, COL_VEHICLES, docs[0]["$id"], data)
    
    # If registry changed, update related job cards
    if new_registry and new_registry != old_registry:
        try:
            jc_res = databases.list_documents(
                DB_ID, COL_JOB_CARDS,
                queries=[Query.equal("vehicle_vin", vin), Query.limit(100)]
            )
            for jc_doc in jc_res["documents"]:
                databases.update_document(
                    DB_ID, COL_JOB_CARDS, jc_doc["$id"],
                    {"vehicle_registry": new_registry}
                )
        except Exception as e:
            print(f"Error updating job cards for vin {vin}: {e}")
            
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
    docs = result["documents"]
    if not docs:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    databases.update_document(DB_ID, COL_VEHICLES, docs[0]["$id"], {"active_status": False})
    return None
