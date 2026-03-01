from typing import List, Optional
from datetime import datetime, timezone

from appwrite.id import ID
from appwrite.query import Query
from fastapi import APIRouter, Depends, HTTPException, status, Query as QParam

from app.core.appwrite_client import databases, DB_ID, COL_JOB_CARDS
from app.core.security import get_current_user
from app.schemas.job_card import JobCardCreate, JobCardUpdate, JobCardResponse

router = APIRouter(prefix="/job-cards", tags=["Job Cards"])


def _doc_to_response(doc: dict) -> JobCardResponse:
    return JobCardResponse(
        job_card_id=doc["$id"],
        vehicle_vin=doc["vehicle_vin"],
        vehicle_registry=doc["vehicle_registry"],
        upload_mechanic=doc["upload_mechanic"],
        parts_affected=doc["parts_affected"],
        details=doc["details"],
        status=doc["status"],
        created_at=doc.get("created_at", doc.get("$createdAt", "")),
        updated_at=doc.get("updated_at"),
    )


@router.post("", response_model=JobCardResponse, status_code=status.HTTP_201_CREATED)
def create_job_card(
    job_card_data: JobCardCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new job card."""
    now = datetime.now(timezone.utc).isoformat()
    doc = databases.create_document(
        database_id=DB_ID,
        collection_id=COL_JOB_CARDS,
        document_id=ID.unique(),
        data={
            "vehicle_vin": job_card_data.vehicle_vin,
            "vehicle_registry": job_card_data.vehicle_registry,
            "upload_mechanic": current_user["$id"],
            "parts_affected": job_card_data.parts_affected,
            "details": job_card_data.details,
            "status": "pending",
            "created_at": now,
        }
    )
    return _doc_to_response(doc)


@router.get("", response_model=List[JobCardResponse])
def list_job_cards(
    limit: int = QParam(100, le=100),
    vin: Optional[str] = None,
    registry: Optional[str] = None,
    job_status: Optional[str] = QParam(None, alias="status"),
    current_user: dict = Depends(get_current_user)
):
    """List job cards with optional filters."""
    queries = [Query.limit(limit)]
    if vin:
        queries.append(Query.equal("vehicle_vin", vin))
    if registry:
        queries.append(Query.equal("vehicle_registry", registry))
    if job_status:
        queries.append(Query.equal("status", job_status))

    result = databases.list_documents(
        database_id=DB_ID,
        collection_id=COL_JOB_CARDS,
        queries=queries
    )
    return [_doc_to_response(d) for d in result.get("documents", [])]


@router.get("/{job_card_id}", response_model=JobCardResponse)
def get_job_card(
    job_card_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get job card by ID."""
    try:
        doc = databases.get_document(DB_ID, COL_JOB_CARDS, job_card_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job card not found")
    return _doc_to_response(doc)


@router.put("/{job_card_id}", response_model=JobCardResponse)
def update_job_card(
    job_card_id: str,
    job_card_update: JobCardUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a job card."""
    try:
        databases.get_document(DB_ID, COL_JOB_CARDS, job_card_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job card not found")

    data = {k: v for k, v in job_card_update.model_dump().items() if v is not None}
    data["updated_at"] = datetime.now(timezone.utc).isoformat()

    doc = databases.update_document(DB_ID, COL_JOB_CARDS, job_card_id, data)
    return _doc_to_response(doc)


@router.delete("/{job_card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_card(
    job_card_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a job card."""
    try:
        databases.get_document(DB_ID, COL_JOB_CARDS, job_card_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job card not found")
    databases.delete_document(DB_ID, COL_JOB_CARDS, job_card_id)
    return None


@router.put("/{job_card_id}/status", response_model=JobCardResponse)
def update_job_card_status(
    job_card_id: str,
    new_status: str = QParam(..., alias="status", pattern="^(pending|in-progress|completed)$"),
    current_user: dict = Depends(get_current_user)
):
    """Update job card status only."""
    try:
        databases.get_document(DB_ID, COL_JOB_CARDS, job_card_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job card not found")

    doc = databases.update_document(
        DB_ID, COL_JOB_CARDS, job_card_id,
        {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}
    )
    return _doc_to_response(doc)
