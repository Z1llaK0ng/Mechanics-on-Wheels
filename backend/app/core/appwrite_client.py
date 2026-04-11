"""
Appwrite client singleton.
All API routers import `databases` and the COL_* constants from here.
"""
from appwrite.client import Client
from appwrite.services.databases import Databases

from app.config import settings

# ── Collection IDs (must match setup_appwrite_db.py) ──────────────────────────
COL_SHOP          = "shop"
COL_MECHANICS     = "mechanics"
COL_VEHICLES      = "vehicles"
COL_JOB_CARDS     = "job_cards"
COL_ACTIVE_SUBS   = "active_subs"
COL_SUBSCRIPTIONS = "subscriptions"
COL_VEHICLE_OWNERS = "vehicle_owners"
COL_MODULE_GROUPS = "module_groups"
COL_GLOBAL_DB     = "global_db"

DB_ID = settings.APPWRITE_DB_ID

# ── Singleton client ───────────────────────────────────────────────────────────
_client = Client()
_client.set_endpoint(settings.APPWRITE_ENDPOINT)
_client.set_project(settings.APPWRITE_PROJECT_ID)
_client.set_key(settings.APPWRITE_API_KEY)

databases: Databases = Databases(_client)
