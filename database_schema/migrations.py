"""
CarrySpanner — Appwrite Migrations & Seeding
=====================================================
All schema migrations and data-seeding tasks in one place.
Each migration is a self-contained function that can be run individually.

Usage — run everything:
    python migrations.py

Usage — run a specific migration:
    python migrations.py seed_subscriptions
    python migrations.py add_staffrole

Available commands:
    seed_subscriptions        Add 'price'/'desc' attributes + seed subscription docs
    add_staffrole             Add 'staffrole' attribute to mechanics + backfill docs
    add_shop_id_to_job_cards       Add 'shop_id' string attribute to job_cards collection
    add_is_global_to_job_cards     Add 'is_global' boolean + backfill to job-cards collection
    create_global_db               Create global_db collection with attributes and indexes
    backfill_job_cards_shop_id     Backfill shop_id on legacy job cards via mechanic mapping

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
        "desc": "Allow your workshop's job cards and vehicle registry to be seen by other shops on the CarrySpanner network.",
        "price": {"monthly": 34, "yearly": 340},
    },
    {
        "id":   "search",
        "name": "Search Module",
        "desc": "Advanced search capabilities across all modules for quick retrieval of vehicles, customers, and job cards.",
        "price": {"monthly": 15, "yearly": 150},
    },
    {
        "id":   "shop-map",
        "name": "Shop Map",
        "desc": "Interactive geographical map to visualize shop locations and customer distribution.",
        "price": {"monthly": 20, "yearly": 200},
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
# MIGRATION 7 — Create shop_customers junction table
# ════════════════════════════════════════════════════════════════════════════

def create_shop_customers():
    """
    Migration 7: Create the shop_customers junction collection.

    This replaces the shop_id field on vehicle_owners with a many-to-many
    link table so one customer can be associated with multiple shops.

    Schema:
        customer_id  — string(36)  Appwrite $id of a vehicle_owners document
        shop_id      — string(36)  Appwrite $id of a shop document

    A unique composite index on (customer_id, shop_id) prevents duplicates.
    """
    print("\n━━━ [7] create_shop_customers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    COL = "shop_customers"

    # Step 1 — collection
    try:
        db.create_collection(
            database_id=DB_ID,
            collection_id=COL,
            name="shop_customers",
            document_security=False,
        )
        print(f"  📁 Collection '{COL}' created.")
    except Exception as e:
        if "already exists" in str(e).lower() or "409" in str(e):
            print(f"  ℹ️  Collection '{COL}' already exists — skipping.")
        else:
            raise
    time.sleep(0.5)

    # Step 2 — attributes
    print("  Adding attributes…")
    _str_attr(COL, "customer_id", size=36, required=True)
    _str_attr(COL, "shop_id",     size=36, required=True)

    print("  ⏳ Waiting 5 s for attributes to become active…")
    time.sleep(5)

    # Step 3 — unique composite index
    print("  Creating unique index on (shop_id, customer_id)…")
    try:
        db.create_index(
            database_id=DB_ID,
            collection_id=COL,
            key="idx_shop_customer_unique",
            type="unique",
            attributes=["shop_id", "customer_id"],
        )
        print("  ✅ Index created.")
    except Exception as e:
        if "already exists" in str(e).lower() or "409" in str(e):
            print("  ℹ️  Index already exists — skipped.")
        else:
            print(f"  ⚠️  Index error: {e}")

    print("  ✅ create_shop_customers done.")


# ════════════════════════════════════════════════════════════════════════════
# MIGRATION 8 — Add shop_id to job_cards
# ════════════════════════════════════════════════════════════════════════════

def add_shop_id_to_job_cards():
    """
    Migration 8: Add optional 'shop_id' string attribute (size 255, default '')
    to the job_cards collection so newly created job cards persist their shop.
    Existing documents will have shop_id='' until a new card is created.
    """
    print("\n━━━ [8] add_shop_id_to_job_cards ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    COL = "job_cards"

    print("  Adding attribute…")
    _str_attr(COL, "shop_id", size=255, required=False, default="")

    print("  ⏳ Waiting 3 s for attribute to become active…")
    time.sleep(3)
    print("  ✅ add_shop_id_to_job_cards done.")


# ════════════════════════════════════════════════════════════════════════════
# MIGRATION 9 — Add is_global to job-cards + backfill
# ════════════════════════════════════════════════════════════════════════════

def add_is_global_to_job_cards():
    """
    Migration 9: Add 'is_global' boolean attribute (default False) to the
    job-cards collection and backfill existing documents.
    Cards that already had a non-empty shop_id are considered globally shared
    and will be backfilled with is_global=True.
    """
    print("\n━━━ [9] add_is_global_to_job_cards ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    COL = "job-cards"

    print("  Adding attribute…")
    _bool_attr(COL, "is_global", required=False, default=False)

    print("  ⏳ Waiting 3 s for attribute to become active…")
    time.sleep(3)

    print("  Backfilling existing job cards…")
    offset = 0
    limit  = 100
    filled = 0

    while True:
        result = db.list_documents(DB_ID, COL, queries=[Query.limit(limit), Query.offset(offset)])
        docs = result["documents"]
        if not docs:
            break
        for doc in docs:
            if doc.get("is_global") is None:
                is_global = bool(doc.get("shop_id"))
                db.update_document(DB_ID, COL, doc["$id"], {"is_global": is_global})
                filled += 1
            time.sleep(0.1)
        offset += len(docs)
        if len(docs) < limit:
            break

    print(f"\n  ✅ add_is_global_to_job_cards done — {filled} backfilled.")


# ════════════════════════════════════════════════════════════════════════════
# MIGRATION 10 — Create global_db collection
# ════════════════════════════════════════════════════════════════════════════

def create_global_db():
    """
    Migration 10: Create the global_db collection with all required attributes
    and search/lookup indexes for cross-shop vehicle record sharing.

    Schema:
        job_card_id      — string(36), required, unique
        vehicle_vin      — string(17), optional
        vehicle_registry — string(20), optional
        shop_id          — string(36), optional
    """
    print("\n━━━ [10] create_global_db ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    COL = "global_db"

    # Step 1 — collection
    try:
        db.create_collection(
            database_id=DB_ID,
            collection_id=COL,
            name="Global Database",
            document_security=False,
        )
        print(f"  📁 Collection '{COL}' created.")
    except Exception as e:
        if "already exists" in str(e).lower() or "409" in str(e):
            print(f"  ℹ️  Collection '{COL}' already exists — skipping.")
        else:
            raise
    time.sleep(1)

    # Step 2 — attributes
    print("  Adding attributes…")
    _str_attr(COL, "job_card_id",      size=36,  required=True)
    _str_attr(COL, "vehicle_vin",      size=17,  required=False)
    _str_attr(COL, "vehicle_registry", size=20,  required=False)
    _str_attr(COL, "shop_id",          size=36,  required=False)

    print("  ⏳ Waiting 5 s for attributes to become active…")
    time.sleep(5)

    # Step 3 — indexes
    print("  Creating indexes…")
    INDEXES = [
        ("idx_job_card_id",       "unique",   ["job_card_id"]),
        ("idx_vehicle_vin",       "key",      ["vehicle_vin"]),
        ("idx_vehicle_registry",  "key",      ["vehicle_registry"]),
        ("idx_vin_search",        "fulltext", ["vehicle_vin"]),
        ("idx_registry_search",   "fulltext", ["vehicle_registry"]),
    ]
    for idx_id, idx_type, attrs in INDEXES:
        try:
            db.create_index(DB_ID, COL, idx_id, idx_type, attrs)
            print(f"  ✅ Index '{idx_id}' created.")
        except Exception as e:
            if "already exists" in str(e).lower() or "409" in str(e):
                print(f"  ℹ️  Index '{idx_id}' already exists — skipped.")
            else:
                print(f"  ⚠️  Index error for '{idx_id}': {e}")
        time.sleep(0.3)

    print("  ✅ create_global_db done.")


# ════════════════════════════════════════════════════════════════════════════
# MIGRATION 11 — Backfill shop_id on legacy job cards
# ════════════════════════════════════════════════════════════════════════════

def backfill_job_cards_shop_id():
    """
    Migration 11: Backfill the 'shop_id' field on any job cards that were
    created before the shop_id attribute existed.

    Strategy: build a mechanic_id → shop_id map from the mechanics collection,
    then for every job card missing a shop_id look up its upload_mechanic and
    stamp the correct shop_id onto the document.
    """
    print("\n━━━ [11] backfill_job_cards_shop_id ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    COL_JC  = "job_cards"
    COL_MEC = "mechanics"

    # Step 1 — build mechanic_id → shop_id map
    print("  Building mechanic → shop_id map…")
    mechanics_map: dict = {}
    offset = 0
    while True:
        res = db.list_documents(DB_ID, COL_MEC, queries=[Query.limit(100), Query.offset(offset)])
        for m in res["documents"]:
            if m.get("shop_id"):
                mechanics_map[m["$id"]] = m["shop_id"]
        if len(res["documents"]) < 100:
            break
        offset += len(res["documents"])
    print(f"  Found {len(mechanics_map)} mechanics with a shop_id.")

    # Step 2 — patch job cards missing a shop_id
    print("  Scanning job cards…")
    offset  = 0
    updated = 0
    skipped = 0

    while True:
        res  = db.list_documents(DB_ID, COL_JC, queries=[Query.limit(100), Query.offset(offset)])
        docs = res["documents"]
        if not docs:
            break
        for jc in docs:
            if not jc.get("shop_id"):
                mechanic_id = jc.get("upload_mechanic")
                if mechanic_id in mechanics_map:
                    db.update_document(DB_ID, COL_JC, jc["$id"], {"shop_id": mechanics_map[mechanic_id]})
                    print(f"    ✅ {jc['$id']} → shop {mechanics_map[mechanic_id]}")
                    updated += 1
                    time.sleep(0.05)
                else:
                    skipped += 1
            else:
                skipped += 1
        offset += len(docs)
        if len(docs) < 100:
            break

    print(f"\n  ✅ backfill_job_cards_shop_id done — {updated} updated, {skipped} skipped/already OK.")


# ════════════════════════════════════════════════════════════════════════════
# Entry point
# ════════════════════════════════════════════════════════════════════════════

MIGRATIONS = {
    "seed_subscriptions":            seed_subscriptions,
    "add_staffrole":                 add_staffrole,
    "seed_module_groups":            seed_module_groups,
    "add_shop_id":                   add_shop_id,
    "add_job_cards_status":          add_job_cards_status,
    "add_can_push_global_db":        add_can_push_global_db,
    "add_vehicle_owner_shop_id":     add_vehicle_owner_shop_id,
    "create_shop_customers":         create_shop_customers,
    "add_shop_id_to_job_cards":      add_shop_id_to_job_cards,
    "add_is_global_to_job_cards":    add_is_global_to_job_cards,
    "create_global_db":              create_global_db,
    "backfill_job_cards_shop_id":    backfill_job_cards_shop_id,
}

if __name__ == "__main__":
    print(f"🔧 CarrySpanner — Appwrite Migrations")
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
