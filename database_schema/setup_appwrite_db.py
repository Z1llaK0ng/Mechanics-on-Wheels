"""
Mechanics-on-Wheels — Appwrite Database Setup Script
=====================================================
Creates the full database schema on Appwrite Cloud.

Usage:
    pip install appwrite python-dotenv
    python setup_appwrite_db.py

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

# ── Load credentials ────────────────────────────────────────────────────────
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

ENDPOINT   = os.environ["APPWRITE_ENDPOINT"]
PROJECT_ID = os.environ["APPWRITE_PROJECT_ID"]
API_KEY    = os.environ["APPWRITE_API_KEY"]

DB_ID   = "mechanics_on_wheels"
DB_NAME = "Mechanics on Wheels"

# ── Appwrite client ──────────────────────────────────────────────────────────
client = Client()
client.set_endpoint(ENDPOINT)
client.set_project(PROJECT_ID)
client.set_key(API_KEY)

db = Databases(client)

# ── Helpers ──────────────────────────────────────────────────────────────────
def create_db():
    try:
        result = db.create(database_id=DB_ID, name=DB_NAME)
        print(f"✅ Database created: {DB_NAME}")
        return result
    except Exception as e:
        if "already exists" in str(e).lower() or "409" in str(e):
            print(f"ℹ️  Database already exists, continuing...")
        else:
            raise

def col(col_id, col_name):
    """Create a collection (permissions left open — restrict in Appwrite console)."""
    try:
        db.create_collection(
            database_id=DB_ID,
            collection_id=col_id,
            name=col_name,
            document_security=False
        )
        print(f"  📁 Collection: {col_name}")
    except Exception as e:
        if "already exists" in str(e).lower() or "409" in str(e):
            print(f"  ℹ️  Collection '{col_name}' already exists, skipping...")
        else:
            raise
    time.sleep(0.3)   # small delay to avoid rate limits

def attr_str(col_id, key, size=255, required=True, default=None, xarray=False):
    try:
        db.create_string_attribute(DB_ID, col_id, key, size, required, default, xarray)
    except Exception as e:
        if "already exists" in str(e).lower() or "409" in str(e):
            pass
        else:
            print(f"    ⚠️  {key}: {e}")
    time.sleep(0.2)

def attr_int(col_id, key, required=True, default=None, xmin=None, xmax=None):
    try:
        db.create_integer_attribute(DB_ID, col_id, key, required, xmin, xmax, default)
    except Exception as e:
        if "already exists" in str(e).lower() or "409" in str(e):
            pass
        else:
            print(f"    ⚠️  {key}: {e}")
    time.sleep(0.2)

def attr_bool(col_id, key, required=True, default=None):
    try:
        db.create_boolean_attribute(DB_ID, col_id, key, required, default)
    except Exception as e:
        if "already exists" in str(e).lower() or "409" in str(e):
            pass
        else:
            print(f"    ⚠️  {key}: {e}")
    time.sleep(0.2)

def attr_datetime(col_id, key, required=True, default=None):
    try:
        db.create_datetime_attribute(DB_ID, col_id, key, required, default)
    except Exception as e:
        if "already exists" in str(e).lower() or "409" in str(e):
            pass
        else:
            print(f"    ⚠️  {key}: {e}")
    time.sleep(0.2)

def attr_enum(col_id, key, elements, required=True, default=None):
    try:
        db.create_enum_attribute(DB_ID, col_id, key, elements, required, default)
    except Exception as e:
        if "already exists" in str(e).lower() or "409" in str(e):
            pass
        else:
            print(f"    ⚠️  {key}: {e}")
    time.sleep(0.2)

def index(col_id, index_id, index_type, attributes):
    try:
        db.create_index(DB_ID, col_id, index_id, index_type, attributes)
    except Exception as e:
        if "already exists" in str(e).lower() or "409" in str(e):
            pass
        else:
            print(f"    ⚠️  index {index_id}: {e}")
    time.sleep(0.3)


# ════════════════════════════════════════════════════════════════════════════
# SCHEMA SETUP
# ════════════════════════════════════════════════════════════════════════════
def setup():
    print(f"\n🔧 Setting up Appwrite database: {DB_NAME}")
    print(f"   Endpoint  : {ENDPOINT}")
    print(f"   Project ID: {PROJECT_ID}\n")

    create_db()
    time.sleep(1)

    # ── 1. SHOP ─────────────────────────────────────────────────────────────
    print("\n[1/7] shop")
    col("shop", "shop")
    attr_str("shop", "shop_name", size=200, required=True)
    attr_str("shop", "location",  size=300, required=True)
    index("shop", "idx_shop_name_unique", "unique", ["shop_name"])

    # ── 2. SUBSCRIPTIONS ────────────────────────────────────────────────────
    print("\n[2/7] subscriptions")
    col("subscriptions", "subscriptions")
    attr_str("subscriptions", "name",           size=100, required=True)
    attr_str("subscriptions", "payment_period", size=50,  required=True)   # 'monthly' | 'yearly'

    # ── 3. ACTIVE_SUBS ──────────────────────────────────────────────────────
    # NOTE: Appwrite has no FK constraints. shop_id and subscription_id store
    # the Appwrite document $id of the referenced shop / subscription.
    print("\n[3/7] active_subs")
    col("active_subs", "active_subs")
    attr_str     ("active_subs", "shop_id",          size=36, required=True)   # → shop.$id
    attr_str     ("active_subs", "subscription_id",  size=36, required=True)   # → subscriptions.$id
    attr_datetime("active_subs", "date_of_activation", required=True)

    # ── 4. MECHANICS ────────────────────────────────────────────────────────
    print("\n[4/7] mechanics")
    col("mechanics", "mechanics")
    attr_str ("mechanics", "first_name",      size=100, required=True)
    attr_str ("mechanics", "last_name",       size=100, required=True)
    attr_str ("mechanics", "email",           size=255, required=True)
    attr_str ("mechanics", "hashed_password", size=255, required=True)
    attr_str ("mechanics", "shop_id",         size=36,  required=True)   # → shop.$id
    attr_bool("mechanics", "active_status",   required=True, default=True)
    index("mechanics", "idx_mechanic_email_unique", "unique", ["email"])

    # ── 5. VEHICLE_OWNERS ───────────────────────────────────────────────────
    print("\n[5/7] vehicle_owners")
    col("vehicle_owners", "vehicle_owners")
    attr_str("vehicle_owners", "name",  size=200, required=True)
    attr_str("vehicle_owners", "phone", size=20,  required=False)
    attr_str("vehicle_owners", "email", size=255, required=False)

    # ── 6. VEHICLES ─────────────────────────────────────────────────────────
    print("\n[6/7] vehicles")
    col("vehicles", "vehicles")
    attr_str ("vehicles", "registry",      size=20,  required=True)    # license plate
    attr_str ("vehicles", "vin",           size=17,  required=True)
    attr_str ("vehicles", "company",       size=100, required=True)    # manufacturer
    attr_str ("vehicles", "brand",         size=100, required=True)    # model
    attr_bool("vehicles", "active_status", required=True, default=True)
    attr_str ("vehicles", "owner_id",      size=36,  required=False)   # → vehicle_owners.$id
    index("vehicles", "idx_registry_unique", "unique", ["registry"])
    index("vehicles", "idx_vin_unique",      "unique", ["vin"])

    # ── 7. JOB_CARDS ────────────────────────────────────────────────────────
    print("\n[7/7] job_cards")
    col("job_cards", "job_cards")
    attr_str     ("job_cards", "vehicle_vin",      size=17,  required=True)   # → vehicles.vin
    attr_str     ("job_cards", "vehicle_registry", size=20,  required=True)   # → vehicles.registry
    attr_str     ("job_cards", "upload_mechanic",  size=36,  required=True)   # → mechanics.$id
    attr_str     ("job_cards", "parts_affected",   size=5000, required=True)  # JSON list
    attr_str     ("job_cards", "details",          size=5000, required=True)  # symptoms/diagnosis
    attr_enum    ("job_cards", "status", ["pending", "in-progress", "completed"],
                  required=True, default="pending")
    attr_datetime("job_cards", "created_at", required=True)
    attr_datetime("job_cards", "updated_at", required=False)

    print("\n\n✅ All done! Open your Appwrite Console to verify the collections.")
    print("   ⚠️  Remember to set collection permissions in the Appwrite Console.")


if __name__ == "__main__":
    setup()
