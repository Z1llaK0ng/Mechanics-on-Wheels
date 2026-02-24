from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.domain.mechanic import Mechanic
from app.domain.active_sub import ActiveSub
from app.domain.subscription import Subscription
from app.domain.shop import Shop

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


class SubscriptionOut:
    """Simple response schema for subscriptions."""
    pass


@router.get("/me")
def get_my_subscriptions(
    current_user: Mechanic = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all active subscription modules for the current mechanic's shop.
    Returns which modules the shop has paid for — used to gate PWA download.
    """
    active_subs = (
        db.query(ActiveSub)
        .filter(ActiveSub.shop_id == current_user.shop_id)
        .all()
    )

    result = []
    for sub in active_subs:
        subscription = db.query(Subscription).filter(
            Subscription.subscription_id == sub.subscription_id
        ).first()

        if subscription:
            result.append({
                "id": sub.id,
                "shop_id": sub.shop_id,
                "subscription_id": sub.subscription_id,
                "date_of_activation": sub.date_of_activation.isoformat(),
                "subscription": {
                    "subscription_id": subscription.subscription_id,
                    "name": subscription.name,
                    "payment_period": subscription.payment_period
                }
            })

    return result


@router.get("/")
def list_all_subscriptions(
    current_user: Mechanic = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all available subscription plans.
    """
    subscriptions = db.query(Subscription).all()
    return [
        {
            "subscription_id": s.subscription_id,
            "name": s.name,
            "payment_period": s.payment_period
        }
        for s in subscriptions
    ]
