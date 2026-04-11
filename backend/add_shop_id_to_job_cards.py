"""
One-off migration: adds the 'shop_id' string attribute to the job_cards
collection in Appwrite so newly created job cards persist their shop.

Run once from the backend directory:
    python add_shop_id_to_job_cards.py
"""
import time
import sys
import os

# Allow importing app config without the full uvicorn stack
sys.path.insert(0, os.path.dirname(__file__))

from app.core.appwrite_client import databases, DB_ID, COL_JOB_CARDS

ATTR = "shop_id"

print(f"Adding attribute '{ATTR}' to collection '{COL_JOB_CARDS}'...")

try:
    databases.create_string_attribute(
        database_id=DB_ID,
        collection_id=COL_JOB_CARDS,
        key=ATTR,
        size=255,
        required=False,
        default="",
    )
    print(f"  ✅ Attribute '{ATTR}' created — waiting for Appwrite to index it...")
    time.sleep(3)
    print("Done. Existing documents will have shop_id='' until a new job card is created.")
except Exception as e:
    err = str(e)
    if "already exists" in err.lower() or "409" in err:
        print(f"  ℹ️  Attribute '{ATTR}' already exists — no action needed.")
    else:
        print(f"  ❌ Error: {err}")
        sys.exit(1)
