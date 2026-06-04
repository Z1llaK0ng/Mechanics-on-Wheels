from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from appwrite.id import ID
from appwrite.query import Query
from fastapi import APIRouter, Depends, HTTPException, status, Query as QParam

from app.core.appwrite_client import databases, DB_ID, COL_JOB_CARDS, COL_GLOBAL_DB
from app.core.security import get_current_user
from app.schemas.job_card import JobCardCreate, JobCardUpdate, JobCardResponse

router = APIRouter(prefix="/job-cards", tags=["Job Cards"])

def _check_job_card_access(doc: dict, current_user: dict):
    shop_id = current_user.get("shop_id")
    if shop_id:
        if doc.get("shop_id") != shop_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this job card.")
    else:
        if doc.get("upload_mechanic") != current_user["$id"]:
            raise HTTPException(status_code=403, detail="Not authorized to access this job card.")


def _doc_to_response(doc: dict) -> JobCardResponse:
    return JobCardResponse(
        job_card_id=doc["$id"],
        vehicle_vin=doc["vehicle_vin"],
        vehicle_registry=doc["vehicle_registry"],
        upload_mechanic=doc["upload_mechanic"],
        shop_id=doc.get("shop_id"),
        parts_affected=doc["parts_affected"],
        details=doc["details"],
        status=doc["status"],
        created_at=doc.get("created_at", doc.get("$createdAt", "")),
        updated_at=doc.get("updated_at"),
        is_uploaded=doc.get("is_uploaded", False),
    )


def _set_is_uploaded(doc: dict) -> None:
    """Query global_db and set doc['is_uploaded'] in place."""
    try:
        g_docs = databases.list_documents(
            DB_ID, COL_GLOBAL_DB,
            queries=[Query.equal("job_card_id", doc["$id"])],
        )["documents"]
        doc["is_uploaded"] = len(g_docs) > 0
    except Exception:
        doc["is_uploaded"] = False


@router.post("", response_model=JobCardResponse, status_code=status.HTTP_201_CREATED)
def create_job_card(
    job_card_data: JobCardCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new job card."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000+00:00")
    doc = databases.create_document(
        database_id=DB_ID,
        collection_id=COL_JOB_CARDS,
        document_id=ID.unique(),
        data={
            "vehicle_vin":      job_card_data.vehicle_vin,
            "vehicle_registry": job_card_data.vehicle_registry,
            "upload_mechanic":  current_user["$id"],
            "shop_id":          current_user.get("shop_id", ""),
            "parts_affected":   job_card_data.parts_affected,
            "details":          job_card_data.details,
            "status":           "pending",
            "created_at":       now,
        }
    )
    # create_job_card docs are not uploaded by default
    doc["is_uploaded"] = False
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
    
    shop_id = current_user.get("shop_id")
    if shop_id:
        queries.append(Query.equal("shop_id", shop_id))
    else:
        queries.append(Query.equal("upload_mechanic", current_user["$id"]))
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
    docs = result["documents"]
    
    # ── Check which ones are uploaded ──
    job_card_ids = [d["$id"] for d in docs]
    uploaded_ids = set()
    if job_card_ids:
        try:
            # Batch query the global DB linking table
            g_docs = databases.list_documents(
                database_id=DB_ID,
                collection_id=COL_GLOBAL_DB,
                queries=[Query.equal("job_card_id", job_card_ids), Query.limit(len(job_card_ids))]
            )["documents"]
            uploaded_ids = {g["job_card_id"] for g in g_docs}
        except Exception:
            pass

    for d in docs:
        d["is_uploaded"] = d["$id"] in uploaded_ids

    return [_doc_to_response(d) for d in docs]


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
        
    _check_job_card_access(doc, current_user)
    
    _set_is_uploaded(doc)
    return _doc_to_response(doc)


@router.put("/{job_card_id}", response_model=JobCardResponse)
def update_job_card(
    job_card_id: str,
    job_card_update: JobCardUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a job card."""
    try:
        doc = databases.get_document(DB_ID, COL_JOB_CARDS, job_card_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job card not found")
        
    _check_job_card_access(doc, current_user)

    data = {k: v for k, v in job_card_update.model_dump().items() if v is not None}
    # omit updated_at — it's a datetime attribute; Appwrite tracks $updatedAt automatically

    doc = databases.update_document(DB_ID, COL_JOB_CARDS, job_card_id, data)
    _set_is_uploaded(doc)
    return _doc_to_response(doc)


@router.delete("/{job_card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_card(
    job_card_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a job card."""
    try:
        doc = databases.get_document(DB_ID, COL_JOB_CARDS, job_card_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job card not found")
        
    _check_job_card_access(doc, current_user)
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
        doc = databases.get_document(DB_ID, COL_JOB_CARDS, job_card_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Job card not found")
        
    _check_job_card_access(doc, current_user)

    doc = databases.update_document(
        DB_ID, COL_JOB_CARDS, job_card_id,
        {"status": new_status}  # omit updated_at — Appwrite tracks $updatedAt automatically
    )
    _set_is_uploaded(doc)
    return _doc_to_response(doc)


# ── Backfill: stamp shop_id on ALL cards that belong to this mechanic ──────────

@router.post("/backfill-shop-id", tags=["Job Cards"])
def backfill_shop_id(current_user: dict = Depends(get_current_user)):
    """
    One-shot backfill: iterates through ALL job cards created by this mechanic
    and sets shop_id on any that are missing it.
    Returns a count of updated documents.
    """
    mechanic_id = current_user["$id"]
    shop_id     = current_user.get("shop_id", "")
    if not shop_id:
        raise HTTPException(status_code=400, detail="Current user has no shop_id.")

    # Check permission for mechanics
    if current_user.get("role") != "admin" and not current_user.get("can_push_global_db"):
        raise HTTPException(status_code=403, detail="You do not have permission to push data to the Global Database.")

    updated = 0
    offset  = 0
    batch   = 100

    while True:
        result = databases.list_documents(
            database_id=DB_ID,
            collection_id=COL_JOB_CARDS,
            queries=[
                Query.equal("upload_mechanic", mechanic_id),
                Query.limit(batch),
                Query.offset(offset),
            ],
        )
        docs = result["documents"]
        if not docs:
            break

        for doc in docs:
            # Check if it already exists in global DB
            try:
                exists = databases.list_documents(
                    DB_ID, COL_GLOBAL_DB,
                    queries=[Query.equal("job_card_id", doc["$id"])]
                )["documents"]
                if not exists:
                    # Create entry in global DB
                    databases.create_document(
                        database_id=DB_ID,
                        collection_id=COL_GLOBAL_DB,
                        document_id=ID.unique(),
                        data={
                            "job_card_id": doc["$id"],
                            "vehicle_vin": doc.get("vehicle_vin", ""),
                            "vehicle_registry": doc.get("vehicle_registry", ""),
                            "shop_id": shop_id
                        }
                    )
                    updated += 1
            except Exception:
                pass

        if len(docs) < batch:
            break
        offset += batch

    return {"updated": updated}


# ── Tag selected job cards with the current shop_id ───────────────────────────

class JobCardIdsRequest(BaseModel):
    job_card_ids: List[str]

@router.patch("/tag-shop-id", tags=["Job Cards"])
def tag_shop_id(
    payload: JobCardIdsRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Stamp shop_id on a specific list of job card IDs.
    Used by the Global DB Upload tab so mechanics can explicitly mark cards
    as network-visible by ensuring their shop is attached.
    """
    shop_id = current_user.get("shop_id", "")
    if not shop_id:
        raise HTTPException(status_code=400, detail="Current user has no shop_id.")

    # Check permission for mechanics
    if current_user.get("role") != "admin" and not current_user.get("can_push_global_db"):
        raise HTTPException(status_code=403, detail="You do not have permission to push data to the Global Database.")

    updated = 0
    errors: List[str] = []

    for jid in payload.job_card_ids:
        try:
            # Make sure to get the card metadata
            doc = databases.get_document(DB_ID, COL_JOB_CARDS, jid)
            # Check if it already exists in global DB
            exists = databases.list_documents(
                DB_ID, COL_GLOBAL_DB,
                queries=[Query.equal("job_card_id", jid)]
            )["documents"]
            
            if not exists:
                databases.create_document(
                    database_id=DB_ID,
                    collection_id=COL_GLOBAL_DB,
                    document_id=ID.unique(),
                    data={
                        "job_card_id": jid,
                        "vehicle_vin": doc.get("vehicle_vin", ""),
                        "vehicle_registry": doc.get("vehicle_registry", ""),
                        "shop_id": shop_id
                    }
                )
                updated += 1
        except Exception as e:
            errors.append(f"{jid}: {str(e)}")

    return {"updated": updated, "errors": errors}


# ── Untag: clear shop_id from selected job cards (remove from global DB) ──────

@router.patch("/untag-shop-id", tags=["Job Cards"])
def untag_shop_id(
    payload: JobCardIdsRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Clear shop_id from the specified job card IDs, removing them from the
    Global Database (they will no longer appear in cross-shop searches).
    Only affects cards that belong to the current mechanic/shop.
    """
    mechanic_id = current_user["$id"]
    shop_id     = current_user.get("shop_id", "")

    # Check permission for mechanics
    if current_user.get("role") != "admin" and not current_user.get("can_push_global_db"):
        raise HTTPException(status_code=403, detail="You do not have permission to modify data in the Global Database.")

    updated = 0
    errors: List[str] = []
    skipped = 0

    for jid in payload.job_card_ids:
        try:
            doc = databases.get_document(DB_ID, COL_JOB_CARDS, jid)
            # Safety check: only untag cards that belong to this mechanic or shop
            if doc.get("upload_mechanic") != mechanic_id and doc.get("shop_id") != shop_id:
                skipped += 1
                continue
            
            # Find and delete from global DB
            g_docs = databases.list_documents(
                DB_ID, COL_GLOBAL_DB,
                queries=[Query.equal("job_card_id", jid)]
            )["documents"]
            
            for g in g_docs:
                databases.delete_document(DB_ID, COL_GLOBAL_DB, g["$id"])
                updated += 1
        except Exception as e:
            errors.append(f"{jid}: {str(e)}")

    return {"updated": updated, "skipped": skipped, "errors": errors}
