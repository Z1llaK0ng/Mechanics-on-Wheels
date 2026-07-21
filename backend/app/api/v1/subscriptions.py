from datetime import datetime
from typing import List

from appwrite.id import ID
from appwrite.query import Query
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.appwrite_client import (
    databases, DB_ID, COL_ACTIVE_SUBS, COL_SUBSCRIPTIONS,
    get_docs, get_total, get_field
)
from app.core.security import get_current_user
from app.core.shop_security import get_current_shop_admin

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


class SubscriptionActivateRequest(BaseModel):
    subscription_id: str


DEFAULT_SUBSCRIPTIONS = [
    {"subscription_id": "job-cards_monthly", "name": "Job Card Management", "desc": "Create, fill and track workshop job cards", "payment_period": "monthly", "price": 29},
    {"subscription_id": "job-cards_yearly", "name": "Job Card Management", "desc": "Create, fill and track workshop job cards", "payment_period": "yearly", "price": 290},
    {"subscription_id": "inventory_monthly", "name": "Inventory Management", "desc": "Log spare parts, stock levels and supplier records", "payment_period": "monthly", "price": 39},
    {"subscription_id": "inventory_yearly", "name": "Inventory Management", "desc": "Log spare parts, stock levels and supplier records", "payment_period": "yearly", "price": 390},
    {"subscription_id": "crm_monthly", "name": "Customer Relationships", "desc": "Customer profiles and vehicle assignment", "payment_period": "monthly", "price": 19},
    {"subscription_id": "crm_yearly", "name": "Customer Relationships", "desc": "Customer profiles and vehicle assignment", "payment_period": "yearly", "price": 190},
    {"subscription_id": "invoicing_monthly", "name": "Invoicing & Financials", "desc": "Parts cost tracking, billing and workshop revenue", "payment_period": "monthly", "price": 49},
    {"subscription_id": "invoicing_yearly", "name": "Invoicing & Financials", "desc": "Parts cost tracking, billing and workshop revenue", "payment_period": "yearly", "price": 490},
    {"subscription_id": "employees_monthly", "name": "Employee Management", "desc": "Track technicians and workshop staff", "payment_period": "monthly", "price": 25},
    {"subscription_id": "employees_yearly", "name": "Employee Management", "desc": "Track technicians and workshop staff", "payment_period": "yearly", "price": 250},
    {"subscription_id": "global-db_monthly", "name": "Global Database", "desc": "DVLA VIN lookup and cross-shop vehicle history", "payment_period": "monthly", "price": 59},
    {"subscription_id": "global-db_yearly", "name": "Global Database", "desc": "DVLA VIN lookup and cross-shop vehicle history", "payment_period": "yearly", "price": 590},
    {"subscription_id": "search_monthly", "name": "Advanced Search", "desc": "Fast search across all shop records", "payment_period": "monthly", "price": 15},
    {"subscription_id": "search_yearly", "name": "Advanced Search", "desc": "Fast search across all shop records", "payment_period": "yearly", "price": 150},
    {"subscription_id": "shop-map_monthly", "name": "Shop Map", "desc": "Visual workshop location mapping", "payment_period": "monthly", "price": 15},
    {"subscription_id": "shop-map_yearly", "name": "Shop Map", "desc": "Visual workshop location mapping", "payment_period": "yearly", "price": 150},
]


@router.get("/me")
def get_my_subscriptions(current_user: dict = Depends(get_current_user)):
    """
    Get active subscriptions for the current mechanic's shop.
    Used to gate PWA download and feature access.
    """
    shop_id = current_user.get("shop_id", "")

    try:
        active_subs = databases.list_documents(
            database_id=DB_ID,
            collection_id=COL_ACTIVE_SUBS,
            queries=[Query.equal("shop_id", shop_id)]
        )

        result = []
        for sub in get_docs(active_subs):
            sub_id = get_field(sub, "subscription_id")
            doc_id = get_field(sub, "$id") or get_field(sub, "id", "")
            activation_date = get_field(sub, "date_of_activation", "")
            try:
                subscription = databases.get_document(DB_ID, COL_SUBSCRIPTIONS, sub_id)
            except Exception:
                subscription = {"$id": sub_id, "name": sub_id.split('_')[0], "payment_period": "monthly", "desc": ""}

            sub_name = get_field(subscription, "name", sub_id)
            result.append({
                "id": doc_id,
                "shop_id": get_field(sub, "shop_id", shop_id),
                "subscription_id": sub_id,
                "date_of_activation": activation_date,
                "subscription": {
                    "subscription_id": get_field(subscription, "$id") or sub_id,
                    "name": sub_name,
                    "payment_period": get_field(subscription, "payment_period", "monthly"),
                    "description": get_field(subscription, "desc", ""),
                },
                # Frontend AppModule shape
                "activeSince": activation_date,
                "routeKey": sub_name.lower().replace(" ", "-"),
                "features": [],
            })

        return result
    except Exception as e:
        print(f"[WARN] get_my_subscriptions failed: {e}")
        return []


@router.get(
    "/shop-active",
    summary="Get the active subscription IDs for the currently logged-in shop admin",
)
def get_shop_active_subscriptions(
    current_admin: dict = Depends(get_current_shop_admin),
):
    shop_id = current_admin.get("shop_id", "")
    try:
        active_subs = databases.list_documents(
            database_id=DB_ID,
            collection_id=COL_ACTIVE_SUBS,
            queries=[Query.equal("shop_id", shop_id)],
        )
        return [get_field(doc, "subscription_id") for doc in get_docs(active_subs) if get_field(doc, "subscription_id")]
    except Exception as e:
        print(f"[WARN] get_shop_active_subscriptions failed: {e}")
        return []


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    summary="Activate a subscription for the current shop (Shop Portal admin)",
)
def activate_subscription_for_shop(
    payload: SubscriptionActivateRequest,
    current_admin: dict = Depends(get_current_shop_admin),
):
    shop_id = current_admin.get("shop_id")

    # Check for existing active subscription
    try:
        existing = databases.list_documents(
            database_id=DB_ID,
            collection_id=COL_ACTIVE_SUBS,
            queries=[
                Query.equal("shop_id", shop_id),
                Query.equal("subscription_id", payload.subscription_id),
            ],
        )
        if get_total(existing) > 0:
            return {"detail": "Already active"}
    except Exception:
        pass

    try:
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
    except Exception as e:
        print(f"[WARN] create_document active_subs failed: {e}")

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

    try:
        result = databases.list_documents(
            database_id=DB_ID,
            collection_id=COL_ACTIVE_SUBS,
            queries=[
                Query.equal("shop_id", shop_id),
                Query.equal("subscription_id", subscription_id),
            ],
        )
        for doc in get_docs(result):
            doc_id = get_field(doc, "$id") or get_field(doc, "id")
            if doc_id:
                databases.delete_document(DB_ID, COL_ACTIVE_SUBS, doc_id)
    except Exception as e:
        print(f"[WARN] deactivate_subscription_for_shop failed: {e}")

    return {"detail": "Deactivated"}


@router.get("/")
def list_all_subscriptions():
    """List all available subscription plans."""
    try:
        result = databases.list_documents(database_id=DB_ID, collection_id=COL_SUBSCRIPTIONS)
        docs = get_docs(result)
        if docs:
            return [
                {
                    "subscription_id": get_field(s, "$id") or get_field(s, "subscription_id", ""),
                    "name": get_field(s, "name", "Module Plan"),
                    "desc": get_field(s, "desc", ""),
                    "payment_period": get_field(s, "payment_period", "monthly"),
                    "price": get_field(s, "price", 0),
                }
                for s in docs
            ]
    except Exception as e:
        print(f"[WARN] list_all_subscriptions Appwrite error: {e}")

    return DEFAULT_SUBSCRIPTIONS


