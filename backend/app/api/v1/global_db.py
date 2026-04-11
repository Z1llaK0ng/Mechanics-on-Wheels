"""
Global Database endpoints.
Allows cross-shop listing and search of job cards tagged with a shop_id.
"""
from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, Query as QParam

from appwrite.query import Query

from app.core.appwrite_client import databases, DB_ID, COL_JOB_CARDS, COL_SHOP, COL_GLOBAL_DB
from app.core.security import get_current_user
from app.schemas.job_card import JobCardResponse

router = APIRouter(prefix="/global-db", tags=["Global Database"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _resolve_shop_names(shop_ids: List[str]) -> Dict[str, str]:
    """Batch-fetch shop names for a list of shop_ids. Returns {shop_id: shop_name}."""
    unique = list({sid for sid in shop_ids if sid})
    if not unique:
        return {}
    name_map: Dict[str, str] = {}
    try:
        result = databases.list_documents(
            database_id=DB_ID,
            collection_id=COL_SHOP,
            queries=[
                Query.equal("$id", unique[0]) if len(unique) == 1
                else Query.equal("$id", unique),
                Query.limit(len(unique) + 5),
            ],
        )
        for doc in result["documents"]:
            name_map[doc["$id"]] = doc.get("shop_name", doc["$id"])
    except Exception:
        pass
    return name_map


def _enrich(docs: list) -> List[JobCardResponse]:
    """Convert Appwrite documents to responses, resolving shop names."""
    shop_ids = [d.get("shop_id", "") for d in docs]
    names = _resolve_shop_names(shop_ids)
    results = []
    for d in docs:
        sid = d.get("shop_id") or ""
        results.append(JobCardResponse(
            job_card_id=d["$id"],
            vehicle_vin=d["vehicle_vin"],
            vehicle_registry=d["vehicle_registry"],
            upload_mechanic=d["upload_mechanic"],
            shop_id=sid or None,
            shop_name=names.get(sid) if sid else None,
            parts_affected=d["parts_affected"],
            details=d["details"],
            status=d["status"],
            created_at=d.get("created_at", d.get("$createdAt", "")),
            updated_at=d.get("updated_at"),
        ))
    return results


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[JobCardResponse])
def list_global_cards(
    limit: int = QParam(200, le=500),
    current_user: dict = Depends(get_current_user),
):
    """
    Return all job cards that have been uploaded to the Global Database
    (those with a non-empty shop_id). The frontend filters client-side.
    """
    raw: list = []
    offset = 0
    batch = 100

    while True:
        try:
            result = databases.list_documents(
                database_id=DB_ID,
                collection_id=COL_GLOBAL_DB,
                queries=[
                    Query.limit(batch),
                    Query.offset(offset),
                ],
            )
        except Exception:
            break

        g_docs = result["documents"]
        if not g_docs:
            break
            
        # Get matching job cards
        jids = [g["job_card_id"] for g in g_docs]
        if jids:
            try:
                j_docs = databases.list_documents(
                    database_id=DB_ID,
                    collection_id=COL_JOB_CARDS,
                    queries=[Query.equal("$id", jids), Query.limit(len(jids))]
                )["documents"]
                raw.extend(j_docs)
            except Exception:
                pass

        if len(raw) >= limit or len(g_docs) < batch:
            break
            
        offset += batch

    # Need to enrich and return up to `limit`
    return _enrich(raw[:limit])


@router.get("/search", response_model=List[JobCardResponse])
def global_search(
    q: str = QParam(..., min_length=1, description="VIN or plate number"),
    limit: int = QParam(50, le=100),
    current_user: dict = Depends(get_current_user),
):
    """Search job cards across ALL shops by VIN or vehicle registry plate."""
    q = q.strip()
    raw: list = []
    seen: set = set()

    def _try_query(queries):
        try:
            return databases.list_documents(
                database_id=DB_ID,
                collection_id=COL_GLOBAL_DB,
                queries=queries,
            )["documents"]
        except Exception:
            return []

    g_raw = []
    # By VIN (fulltext, fallback to exact)
    for docs in [
        _try_query([Query.search("vehicle_vin", q), Query.limit(limit)]),
        _try_query([Query.equal("vehicle_vin", q), Query.limit(limit)]),
    ]:
        for d in docs:
            if d["job_card_id"] not in seen:
                g_raw.append(d["job_card_id"])
                seen.add(d["job_card_id"])

    # By registry
    for docs in [
        _try_query([Query.search("vehicle_registry", q), Query.limit(limit)]),
        _try_query([Query.equal("vehicle_registry", q), Query.limit(limit)]),
    ]:
        for d in docs:
            if d["job_card_id"] not in seen:
                g_raw.append(d["job_card_id"])
                seen.add(d["job_card_id"])

    if not g_raw:
        return []
        
    # Hydrate
    try:
        raw = databases.list_documents(
            database_id=DB_ID,
            collection_id=COL_JOB_CARDS,
            queries=[Query.equal("$id", list(seen)), Query.limit(len(seen))]
        )["documents"]
    except Exception:
        raw = []

    return _enrich(raw)
