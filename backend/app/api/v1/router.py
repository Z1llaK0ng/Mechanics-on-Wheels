from fastapi import APIRouter
from app.api.v1 import auth, job_cards, vehicles, subscriptions, shop_auth, shops, global_db, crm

# Main API v1 router
api_router = APIRouter()

# Include sub-routers
api_router.include_router(auth.router)
api_router.include_router(shop_auth.router)
api_router.include_router(job_cards.router)
api_router.include_router(vehicles.router)
api_router.include_router(subscriptions.router)
api_router.include_router(shops.router)
api_router.include_router(global_db.router)
api_router.include_router(crm.router)
