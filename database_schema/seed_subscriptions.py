"""
Mechanics-on-Wheels — Subscription Seed Script
================================================
1. Adds a `price` integer attribute to the existing `subscriptions` collection.
2. Creates one document per billing period (monthly / yearly) for every module.
   Document IDs follow the pattern  <module-id>_<period>  e.g. "job-cards_monthly"
   so the frontend and backend can look them up by a predictable key.

Usage:
    pip install appwrite python-dotenv
    python seed_subscriptions.py

Requires a .env file in the same directory with:
    APPWRITE_ENDPOINT
    APPWRITE_PROJECT_ID
    APPWRITE_API_KEY
"""

import os
import time
from dotenv import load_dotenv
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.id import ID

# ── Credentials ───────────────────────────────────────────────────────────────
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

ENDPOINT   = os.environ["APPWRITE_ENDPOINT"]
PROJECT_ID = os.environ["APPWRITE_PROJECT_ID"]
API_KEY    = os.environ["APPWRITE_API_KEY"]

# ── Resolve the database ID (same logic as setup_appwrite_db.py) ──────────────
client = Client()
client.set_endpoint(ENDPOINT)
client.set_project(PROJECT_ID)
client.set_key(API_KEY)

db = Databases(client)

def resolve_db_id():
    """Return the ID of our Appwrite database (creates it only if missing)."""
    db_id = "global-erp"
    try:
        db.get(db_id)
        return db_id
    except Exception:
        pass
    # Fall back: use whichever database already exists
    existing = db.list()
    databases = existing.get("databases", [])
    if databases:
        db_id = databases[0]["$id"]
        print(f"ℹ️  Using existing database: {db_id}")
        return db_id
    raise RuntimeError("No Appwrite database found — run setup_appwrite_db.py first.")

DB_ID = resolve_db_id()
COL   = "subscriptions"

# ── Module catalogue (must stay in sync with useShopAuth.ts features) ────────
MODULES = [
    {
        "id":   "job-cards",
        "name": "Job Cards",
        "desc": "Upload existing job cards, create new cards, use form-based creation, and view a full history log of past cards.",
        "price": {"monthly": 29, "yearly": 290},
    },
    {
        "id":   "inventory",
        "name": "Inventory & Parts",
        "desc": "Log parts used on jobs and handle part request forms for your workshop stock.",
        "price": {"monthly": 24, "yearly": 240},
    },
    {
        "id":   "crm",
        "name": "Customer Relationships",
        "desc": "Create customer profiles, assign vehicles to owners, manage vehicle registration, and link job cards to customers.",
        "price": {"monthly": 22, "yearly": 220},
    },
    {
        "id":   "invoicing",
        "name": "Invoicing & Billing",
        "desc": "Accounting module to track amounts spent on parts and revenue earned from completed job cards.",
        "price": {"monthly": 19, "yearly": 190},
    },
    {
        "id":   "employees",
        "name": "Employee Management",
        "desc": "Track active and past employees. For technicians, view hours and open/active job cards.",
        "price": {"monthly": 25, "yearly": 250},
    },
    {
        "id":   "global-db",
        "name": "Global Database",
        "desc": "Allow your workshop's job cards and vehicle registry to be seen by other shops on the Mechanics-on-Wheels network.",
        "price": {"monthly": 34, "yearly": 340},
    },
]

# ── Step 1: Add new attributes ────────────────────────────────────────────────
def add_attributes():
    print("\n[1/2] Adding attributes to subscriptions collection…")
    
    # 1. Price
    try:
        db.create_integer_attribute(
            database_id=DB_ID,
            collection_id=COL,
            key="price",
            required=True,
            min=0,
            max=99999,
        )
        print("  ✅ Attribute 'price' created.")
    except Exception as e:
        if "already exists" in str(e).lower() or "409" in str(e):
            print("  ℹ️  Attribute 'price' already exists — skipping.")
        else:
            print(f"  ⚠️  Error creating 'price': {e}")

    # 2. Description
    try:
        db.create_string_attribute(
            database_id=DB_ID,
            collection_id=COL,
            key="desc",
            size=1000,
            required=False, # Make it not required so existing docs don't block it initially
        )
        print("  ✅ Attribute 'desc' created.")
    except Exception as e:
        if "already exists" in str(e).lower() or "409" in str(e):
            print("  ℹ️  Attribute 'desc' already exists — skipping.")
        else:
            print(f"  ⚠️  Error creating 'desc': {e}")
            
    print("  ⏳ Waiting 5 s for attributes to become active…")
    time.sleep(5)

# ── Step 2: Seed documents ────────────────────────────────────────────────────
def seed_documents():
    print("\n[2/2] Seeding subscription documents…")
    created = 0
    skipped = 0

    for mod in MODULES:
        for period in ("monthly", "yearly"):
            doc_id = f"{mod['id']}_{period}"   # e.g. "job-cards_monthly"
            data   = {
                "name":           mod["name"],
                "desc":           mod["desc"],
                "payment_period": period,
                "price":          mod["price"][period],
            }
            try:
                db.create_document(
                    database_id=DB_ID,
                    collection_id=COL,
                    document_id=doc_id,
                    data=data,
                )
                print(f"  ✅  {doc_id:30s}  GH₵ {data['price']}")
                created += 1
            except Exception as e:
                msg = str(e)
                if "already exists" in msg.lower() or "409" in msg:
                    # Document exists — update its price in case it changed
                    try:
                        db.update_document(
                            database_id=DB_ID,
                            collection_id=COL,
                            document_id=doc_id,
                            data=data,
                        )
                        print(f"  🔄  {doc_id:30s}  updated → GH₵ {data['price']}")
                        skipped += 1
                    except Exception as ue:
                        print(f"  ⚠️   {doc_id}: update failed — {ue}")
                else:
                    print(f"  ❌  {doc_id}: {e}")
            time.sleep(0.25)  # avoid rate-limiting

    print(f"\n✅ Done — {created} created, {skipped} updated.")

# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"📦 Seeding subscriptions in database '{DB_ID}'")
    print(f"   Endpoint  : {ENDPOINT}")
    print(f"   Project ID: {PROJECT_ID}")
    add_attributes()
    seed_documents()
    print("\n🎉 Subscription catalogue is ready in Appwrite!")
    print("   Document IDs follow the pattern: <module-id>_<period>")
    print("   e.g.  job-cards_monthly,  global-db_yearly")
