from typing import List

from appwrite.query import Query
from fastapi import APIRouter, Depends

from app.core.appwrite_client import databases, DB_ID, COL_ACTIVE_SUBS, COL_SUBSCRIPTIONS
from app.core.security import get_current_user

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.get("/me")
def get_my_subscriptions(current_user: dict = Depends(get_current_user)):
    """
    Get active subscriptions for the current mechanic's shop.
    Used to gate PWA download and feature access.
    """
    shop_id = current_user.get("shop_id", "")

    active_subs = databases.list_documents(
        database_id=DB_ID,
        collection_id=COL_ACTIVE_SUBS,
        queries=[Query.equal("shop_id", shop_id)]
    )

    result = []
    for sub in active_subs.get("documents", []):
        sub_id = sub["subscription_id"]
        try:
            subscription = databases.get_document(DB_ID, COL_SUBSCRIPTIONS, sub_id)
        except Exception:
            continue

        result.append({
            "id": sub["$id"],
            "shop_id": sub["shop_id"],
            "subscription_id": sub_id,
            "date_of_activation": sub.get("date_of_activation", ""),
            "subscription": {
                "subscription_id": subscription["$id"],
                "name": subscription["name"],
                "payment_period": subscription["payment_period"],
            },
            # Frontend AppModule shape
            "activeSince": sub.get("date_of_activation", ""),
            "routeKey": subscription.get("name", "").lower().replace(" ", "-"),
            "features": [],
        })

    return result


@router.get("/")
def list_all_subscriptions(current_user: dict = Depends(get_current_user)):
    """List all available subscription plans."""
    result = databases.list_documents(database_id=DB_ID, collection_id=COL_SUBSCRIPTIONS)
    return [
        {
            "subscription_id": s["$id"],
            "name": s["name"],
            "payment_period": s["payment_period"],
        }
        for s in result.get("documents", [])
    ]
