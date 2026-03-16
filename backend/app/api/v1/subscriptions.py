from datetime import datetime
from typing import List

from appwrite.id import ID
from appwrite.query import Query
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.appwrite_client import databases, DB_ID, COL_ACTIVE_SUBS, COL_SUBSCRIPTIONS
from app.core.security import get_current_user
from app.core.shop_security import get_current_shop_admin

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


class SubscriptionActivateRequest(BaseModel):
    subscription_id: str


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


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    summary="Activate a subscription for the current shop (Shop Portal admin)",
)
def activate_subscription_for_shop(
    payload: SubscriptionActivateRequest,
    current_admin: dict = Depends(get_current_shop_admin),
):
    """
    Activate a subscription/module for the admin's shop.

    Expects `subscription_id` to match the Appwrite document ID in the
    `subscriptions` collection. This ID is also used by the Shop Portal
    as the module identifier.
    """
    shop_id = current_admin.get("shop_id")

    # Ensure the subscription plan exists
    try:
        databases.get_document(DB_ID, COL_SUBSCRIPTIONS, payload.subscription_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Subscription plan not found.")

    # Avoid duplicate active subscriptions
    existing = databases.list_documents(
        database_id=DB_ID,
        collection_id=COL_ACTIVE_SUBS,
        queries=[
            Query.equal("shop_id", shop_id),
            Query.equal("subscription_id", payload.subscription_id),
        ],
    )
    if existing.get("total", 0) > 0:
        # Idempotent: already active
        return {"detail": "Already active"}

    databases.create_document(
        database_id=DB_ID,
        collection_id=COL_ACTIVE_SUBS,
        document_id=ID.unique(),
        data={
            "shop_id": shop_id,
            "subscription_id": payload.subscription_id,
            "date_of_activation": datetime.utcnow().isoformat(),
        },
    )

    return {"detail": "Activated"}


@router.delete(
    "/{subscription_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate a subscription for the current shop (Shop Portal admin)",
)
def deactivate_subscription_for_shop(
    subscription_id: str,
    current_admin: dict = Depends(get_current_shop_admin),
):
    shop_id = current_admin.get("shop_id")

    # Find active subscription documents and delete them
    result = databases.list_documents(
        database_id=DB_ID,
        collection_id=COL_ACTIVE_SUBS,
        queries=[
            Query.equal("shop_id", shop_id),
            Query.equal("subscription_id", subscription_id),
        ],
    )
    for doc in result.get("documents", []):
        databases.delete_document(DB_ID, COL_ACTIVE_SUBS, doc["$id"])

    return {"detail": "Deactivated"}


@router.get("/")
def list_all_subscriptions():
    """List all available subscription plans."""
    result = databases.list_documents(database_id=DB_ID, collection_id=COL_SUBSCRIPTIONS)
    return [
        {
            "subscription_id": s["$id"],
            "name": s["name"],
            "desc": s.get("desc", ""),
            "payment_period": s["payment_period"],
            "price": s.get("price", 0),
        }
        for s in result.get("documents", [])
    ]
