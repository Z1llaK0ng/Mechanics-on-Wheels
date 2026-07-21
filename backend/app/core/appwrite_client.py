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
COL_SHOP_CUSTOMERS = "shop_customers"   # junction: customer_id × shop_id
COL_MODULE_GROUPS = "module_groups"
COL_GLOBAL_DB     = "global_db"

DB_ID = settings.APPWRITE_DB_ID

# ── Singleton client ───────────────────────────────────────────────────────────
_client = Client()
_client.set_endpoint(settings.APPWRITE_ENDPOINT)
_client.set_project(settings.APPWRITE_PROJECT_ID)
_client.set_key(settings.APPWRITE_API_KEY)

databases: Databases = Databases(_client)


def get_docs(res) -> list:
    """Safely extract documents list from Appwrite DocumentList or dict response."""
    if res is None:
        return []
    if hasattr(res, "documents"):
        return getattr(res, "documents", [])
    if isinstance(res, dict):
        return res.get("documents", [])
    try:
        return res["documents"]
    except Exception:
        return []


def get_total(res) -> int:
    """Safely extract total count from Appwrite DocumentList or dict response."""
    if res is None:
        return 0
    if hasattr(res, "total"):
        return getattr(res, "total", 0)
    if isinstance(res, dict):
        return res.get("total", 0)
    try:
        return res["total"]
    except Exception:
        return 0


def get_field(doc, key: str, default=None):
    """Safely extract a field from an Appwrite Document object or dict."""
    if doc is None:
        return default
    if isinstance(doc, dict):
        return doc.get(key, default)
    if hasattr(doc, key):
        val = getattr(doc, key, default)
        if val is not None:
            return val
    try:
        return doc[key]
    except Exception:
        return default

