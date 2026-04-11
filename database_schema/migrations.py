"""
Mechanics-on-Wheels — Appwrite Migrations & Seeding
=====================================================
All schema migrations and data-seeding tasks in one place.
Each migration is a self-contained function that can be run individually.

Usage — run everything:
    python migrations.py

Usage — run a specific migration:
    python migrations.py seed_subscriptions
    python migrations.py add_staffrole

Available commands:
    seed_subscriptions   Add 'price'/'desc' attributes + seed subscription docs
    add_staffrole        Add 'staffrole' attribute to mechanics + backfill docs

Requires a .env file in the same directory with:
    APPWRITE_ENDPOINT
    APPWRITE_PROJECT_ID
    APPWRITE_API_KEY
    APPWRITE_DB_ID       (optional, defaults to 'global-erp')
"""

import os
import sys
import time
from dotenv import load_dotenv
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.query import Query
from appwrite.id import ID

# ── Credentials ───────────────────────────────────────────────────────────────
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

ENDPOINT   = os.environ["APPWRITE_ENDPOINT"]
PROJECT_ID = os.environ["APPWRITE_PROJECT_ID"]
API_KEY    = os.environ["APPWRITE_API_KEY"]

client = Client()
client.set_endpoint(ENDPOINT)
client.set_project(PROJECT_ID)
client.set_key(API_KEY)

db = Databases(client)


# ── Shared helpers ────────────────────────────────────────────────────────────

def resolve_db_id() -> str:
    """Return the ID of the Appwrite database (prefers 'global-erp')."""
    db_id = os.environ.get("APPWRITE_DB_ID", "global-erp")
    try:
        db.get(db_id)
        return db_id
    except Exception:
        pass
    existing = db.list().get("databases", [])
    if existing:
        found = existing[0]["$id"]
        print(f"ℹ️  Using existing database: {found}")
        return found
    raise RuntimeError("No Appwrite database found — run setup_appwrite_db.py first.")


DB_ID = resolve_db_id()


def _str_attr(col_id: str, key: str, size: int = 255, required: bool = True, default=None):
    try:
        db.create_string_attribute(DB_ID, col_id, key, size, required, default)
        print(f"  ✅ Attribute '{key}' created.")
    except Exception as e:
        if "already exists" in str(e).lower() or "409" in str(e):
            print(f"  ℹ️  Attribute '{key}' already exists — skipped.")
        else:
            print(f"  ⚠️  Error creating '{key}': {e}")
    time.sleep(0.2)


def _int_attr(col_id: str, key: str, required: bool = True, xmin=None, xmax=None, default=None):
    try:
        db.create_integer_attribute(DB_ID, col_id, key, required, xmin, xmax, default)
        print(f"  ✅ Attribute '{key}' created.")
    except Exception as e:
        if "already exists" in str(e).lower() or "409" in str(e):
            print(f"  ℹ️  Attribute '{key}' already exists — skipped.")
        else:
            print(f"  ⚠️  Error creating '{key}': {e}")
    time.sleep(0.2)


def _bool_attr(col_id: str, key: str, required: bool = True, default=None):
    try:
        db.create_boolean_attribute(DB_ID, col_id, key, required, default)
        print(f"  ✅ Attribute '{key}' created.")
    except Exception as e:
        if "already exists" in str(e).lower() or "409" in str(e):
            print(f"  ℹ️  Attribute '{key}' already exists — skipped.")
        else:
            print(f"  ⚠️  Error creating '{key}': {e}")
    time.sleep(0.2)


# ════════════════════════════════════════════════════════════════════════════
# MIGRATION 1 — Subscription seed
# ════════════════════════════════════════════════════════════════════════════

# Module catalogue (must stay in sync with useShopAuth.ts)
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


def seed_subscriptions():
    """
    Migration 1: Add 'price' and 'desc' attributes to the subscriptions
    collection, then upsert one document per module per billing period.
    Document IDs follow the pattern <module-id>_<period>
    e.g. 'job-cards_monthly', 'global-db_yearly'.
    """
    print("\n━━━ [1/2] seed_subscriptions ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    COL = "subscriptions"

    # Step 1 — attributes
    print("  Adding attributes…")
    _int_attr(COL, "price", required=True,  xmin=0, xmax=99999)
    _str_attr(COL, "desc",  size=1000, required=False)

    print("  ⏳ Waiting 5 s for attributes to become active…")
    time.sleep(5)

    # Step 2 — documents (upsert)
    print("  Seeding documents…")
    created = updated = 0
    for mod in MODULES:
        for period in ("monthly", "yearly"):
            doc_id = f"{mod['id']}_{period}"
            data = {
                "name":           mod["name"],
                "desc":           mod["desc"],
                "payment_period": period,
                "price":          mod["price"][period],
            }
            try:
                db.create_document(DB_ID, COL, doc_id, data)
                print(f"    ✅  {doc_id:30s}  GH₵ {data['price']}")
                created += 1
            except Exception as e:
                if "already exists" in str(e).lower() or "409" in str(e):
                    try:
                        db.update_document(DB_ID, COL, doc_id, data)
                        print(f"    🔄  {doc_id:30s}  updated → GH₵ {data['price']}")
                        updated += 1
                    except Exception as ue:
                        print(f"    ⚠️   {doc_id}: update failed — {ue}")
                else:
                    print(f"    ❌  {doc_id}: {e}")
            time.sleep(0.25)

    print(f"\n  ✅ seed_subscriptions done — {created} created, {updated} updated.")


# ════════════════════════════════════════════════════════════════════════════
# MIGRATION 2 — Add staffrole to mechanics
# ════════════════════════════════════════════════════════════════════════════

def add_staffrole():
    """
    Migration 2: Add optional 'staffrole' string attribute (default 'technician')
    to the mechanics collection, then backfill any existing documents that
    are missing the field.
    """
    print("\n━━━ [2/2] add_staffrole ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    COL = "mechanics"

    # Step 1 — attribute
    print("  Adding attribute…")
    _str_attr(COL, "staffrole", size=50, required=False, default="technician")

    print("  ⏳ Waiting 3 s for attribute to become active…")
    time.sleep(3)

    # Step 2 — backfill
    print("  Backfilling existing documents…")
    offset = 0
    limit  = 100
    filled = skipped = 0

    while True:
        result = db.list_documents(DB_ID, COL, queries=[Query.limit(limit), Query.offset(offset)])
        docs = result["documents"]
        if not docs:
            break
        for doc in docs:
            if doc.get("staffrole") is None:
                db.update_document(DB_ID, COL, doc["$id"], {"staffrole": "technician"})
                filled += 1
            else:
                skipped += 1
            time.sleep(0.1)
        offset += len(docs)
        if len(docs) < limit:
            break

    print(f"\n  ✅ add_staffrole done — {filled} backfilled, {skipped} already had a value.")


# ════════════════════════════════════════════════════════════════════════════
# MIGRATION 3 — Seed Module Groups
# ════════════════════════════════════════════════════════════════════════════

def seed_module_groups():
    """
    Migration 3: Seed built-in module groups into the `module_groups` collection
    with shop_id = 'pr3bu1lt'.
    """
    print("\n━━━ [3/3] seed_module_groups ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    COL = "module_groups"

    # Reference pre-built groups equivalent to useShopAuth.ts ALL_MODULE_GROUPS
    ALL_MODULE_GROUPS = [
        {"id": "essential", "name": "Essential Bundle", "icon": "🛠️", "desc": "Most popular bundle covering everyday garage tasks.", "moduleIds": ["job-cards", "inventory", "employees"]},
        {"id": "manager", "name": "Management Suite", "icon": "💼", "desc": "Everything required for customer tracking and billing.", "moduleIds": ["job-cards", "crm", "invoicing"]},
        {"id": "network", "name": "Network Tier", "icon": "🌐", "desc": "Access global vehicle data alongside core job tracking.", "moduleIds": ["job-cards", "global-db"]},
        {"id": "pro-shop", "name": "Pro Shop (All-In-One)", "icon": "🚀", "desc": "The complete package. Every feature for heavy-duty daily operations.", "moduleIds": ["job-cards", "inventory", "crm", "invoicing", "employees", "global-db"]}
    ]

    def get_mod(mid):
        return next((m for m in MODULES if m["id"] == mid), None)

    created = updated = 0
    for group in ALL_MODULE_GROUPS:
        # Calculate standard pricing with 10% discount
        monthly_sum = sum((get_mod(mid)["price"]["monthly"] or 0) for mid in group["moduleIds"])
        discounted_monthly = int(round(monthly_sum * 0.9))
        discounted_yearly = discounted_monthly * 10

        data = {
            "name": group["name"],
            "desc": group["desc"],
            "icon": group["icon"],
            "module_ids": group["moduleIds"],
            "price_monthly": discounted_monthly,
            "price_yearly": discounted_yearly,
            "shop_id": "pr3bu1lt"
        }

        try:
            db.create_document(DB_ID, COL, group["id"], data)
            print(f"    ✅  {group['id']:20s}  created")
            created += 1
        except Exception as e:
            if "already exists" in str(e).lower() or "409" in str(e):
                try:
                    db.update_document(DB_ID, COL, group["id"], data)
                    print(f"    🔄  {group['id']:20s}  updated")
                    updated += 1
                except Exception as ue:
                    print(f"    ⚠️   {group['id']}: update failed — {ue}")
            else:
                print(f"    ❌  {group['id']}: {e}")
        time.sleep(0.2)

    print(f"\n  ✅ seed_module_groups done — {created} created, {updated} updated.")

def add_shop_id():
    """
    Migration: Backfill shop_id = 'pr3bu1lt' to all existing module groups that don't have it.
    """
    print("\n━━━ [4] add_shop_id ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    COL = "module_groups"
    
    offset = 0
    limit  = 100
    updated = skipped = 0

    while True:
        result = db.list_documents(DB_ID, COL, queries=[Query.limit(limit), Query.offset(offset)])
        docs = result["documents"]
        if not docs:
            break
        for doc in docs:
            # If shop_id is missing or somehow empty, backfill it
            if not doc.get("shop_id"):
                try:
                    db.update_document(DB_ID, COL, doc["$id"], {"shop_id": "pr3bu1lt"})
                    updated += 1
                except Exception as e:
                    print(f"    ⚠️ Failed to update {doc['$id']} : {e}")
            else:
                skipped += 1
            time.sleep(0.1)
        offset += len(docs)
        if len(docs) < limit:
            break

    print(f"\n  ✅ add_shop_id done — {updated} updated, {skipped} skipped.")


# ════════════════════════════════════════════════════════════════════════════
# MIGRATION 4 — Add missing status attribute to job_cards
# ════════════════════════════════════════════════════════════════════════════

def add_job_cards_status():
    """
    Migration 4: Add the missing 'status' enum attribute to the job_cards
    collection. The setup script attempted to create this as a required enum
    but it was silently skipped; this migration adds it as optional with a
    default of 'pending' (compatible with existing documents).

    Also verifies that all other required job_cards attributes exist.
    """
    print("\n━━━ [4] add_job_cards_status ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    COL = "job_cards"

    # Ensure all string attributes exist (idempotent)
    for key, size in [
        ("vehicle_vin",      17),
        ("vehicle_registry", 20),
        ("upload_mechanic",  36),
        ("parts_affected",   5000),
        ("details",          5000),
    ]:
        _str_attr(COL, key, size=size, required=True)

    # Add status enum (optional + default so it works on existing empty collection)
    print("  Adding 'status' enum attribute…")
    try:
        db.create_enum_attribute(
            database_id=DB_ID,
            collection_id=COL,
            key="status",
            elements=["pending", "in-progress", "completed"],
            required=False,
            default="pending",
        )
        print("  ✅ Attribute 'status' created.")
    except Exception as e:
        if "already exists" in str(e).lower() or "409" in str(e):
            print("  ℹ️  Attribute 'status' already exists — skipped.")
        else:
            print(f"  ⚠️  Error creating 'status': {e}")

    print("  ⏳ Waiting 5 s for attributes to become active…")
    time.sleep(5)
    print("  ✅ add_job_cards_status done.")

# ════════════════════════════════════════════════════════════════════════════
# MIGRATION 5 — Add can_push_global_db to mechanics
# ════════════════════════════════════════════════════════════════════════════

def add_can_push_global_db():
    """
    Migration 5: Add 'can_push_global_db' boolean attribute (default False)
    to mechanics collection and backfill.
    """
    print("\n━━━ [5] add_can_push_global_db ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    COL = "mechanics"

    print("  Adding attribute…")
    _bool_attr(COL, "can_push_global_db", required=False, default=False)

    print("  ⏳ Waiting 3 s for attribute to become active…")
    time.sleep(3)

    print("  Backfilling existing documents…")
    offset = 0
    limit  = 100
    filled = skipped = 0

    while True:
        result = db.list_documents(DB_ID, COL, queries=[Query.limit(limit), Query.offset(offset)])
        docs = result["documents"]
        if not docs:
            break
        for doc in docs:
            if doc.get("can_push_global_db") is None:
                db.update_document(DB_ID, COL, doc["$id"], {"can_push_global_db": False})
                filled += 1
            else:
                skipped += 1
            time.sleep(0.1)
        offset += len(docs)
        if len(docs) < limit:
            break

    print(f"\n  ✅ add_can_push_global_db done — {filled} backfilled, {skipped} already had a value.")


# ════════════════════════════════════════════════════════════════════════════
# MIGRATION 6 — Add shop_id to vehicle_owners
# ════════════════════════════════════════════════════════════════════════════

def add_vehicle_owner_shop_id():
    """
    Migration 6: Add optional 'shop_id' string attribute to the
    vehicle_owners collection so that CRM customers are scoped per shop.
    Existing documents are left with NULL (no backfill needed since all
    pre-existing owners are legacy data without a shop context).
    """
    print("\n━━━ [6] add_vehicle_owner_shop_id ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    COL = "vehicle_owners"

    print("  Adding attribute…")
    _str_attr(COL, "shop_id", size=36, required=False, default=None)

    print("  ⏳ Waiting 3 s for attribute to become active…")
    time.sleep(3)
    print("  ✅ add_vehicle_owner_shop_id done.")


# ════════════════════════════════════════════════════════════════════════════
# Entry point
# ════════════════════════════════════════════════════════════════════════════

MIGRATIONS = {
    "seed_subscriptions":          seed_subscriptions,
    "add_staffrole":               add_staffrole,
    "seed_module_groups":          seed_module_groups,
    "add_shop_id":                 add_shop_id,
    "add_job_cards_status":        add_job_cards_status,
    "add_can_push_global_db":      add_can_push_global_db,
    "add_vehicle_owner_shop_id":   add_vehicle_owner_shop_id,
    "create_shop_customers":       create_shop_customers,
}

if __name__ == "__main__":
    print(f"🔧 Mechanics-on-Wheels — Appwrite Migrations")
    print(f"   Endpoint  : {ENDPOINT}")
    print(f"   Project ID: {PROJECT_ID}")
    print(f"   Database  : {DB_ID}")

    args = sys.argv[1:]

    if args:
        # Run specific migration(s) passed as arguments
        for name in args:
            if name in MIGRATIONS:
                MIGRATIONS[name]()
            else:
                print(f"\n❌ Unknown migration '{name}'.")
                print(f"   Available: {', '.join(MIGRATIONS)}")
                sys.exit(1)
    else:
        # Run all migrations in order
        for fn in MIGRATIONS.values():
            fn()

    print("\n\n🎉 All done!\n")
