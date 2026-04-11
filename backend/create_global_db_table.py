import os
import time
from dotenv import load_dotenv
from appwrite.client import Client
from appwrite.services.databases import Databases

load_dotenv()
client = Client()
client.set_endpoint(os.environ["APPWRITE_ENDPOINT"])
client.set_project(os.environ["APPWRITE_PROJECT_ID"])
client.set_key(os.environ["APPWRITE_API_KEY"])
db = Databases(client)

DB_ID = os.environ["APPWRITE_DB_ID"]
COL_GLOBAL_DB = "global_db"

print(f"Creating collection {COL_GLOBAL_DB} in db {DB_ID}...")

def create_attr(func, *args, **kwargs):
    try:
        func(*args, **kwargs)
        print(f"  Created attribute: {args[2]}")
    except Exception as e:
        if "already exists" in str(e).lower() or "409" in str(e):
            print(f"  Attribute {args[2]} already exists.")
        else:
            print(f"  Error creating {args[2]}: {e}")
    time.sleep(0.3)

def create_idx(idx_id, idx_type, attrs):
    try:
        db.create_index(DB_ID, COL_GLOBAL_DB, idx_id, idx_type, attrs)
        print(f"  Created index: {idx_id}")
    except Exception as e:
        if "already exists" in str(e).lower() or "409" in str(e):
            print(f"  Index {idx_id} already exists.")
        else:
            print(f"  Error creating index {idx_id}: {e}")
    time.sleep(0.3)

try:
    db.create_collection(
        database_id=DB_ID,
        collection_id=COL_GLOBAL_DB,
        name="Global Database",
        document_security=False
    )
    print("Collection created.")
    time.sleep(1)
except Exception as e:
    if "already exists" in str(e).lower() or "409" in str(e):
        print("Collection already exists.")
    else:
        raise

# job_card_id, vehicle_vin, vehicle_registry, shop_id
create_attr(db.create_string_attribute, DB_ID, COL_GLOBAL_DB, "job_card_id", 36, True)
create_attr(db.create_string_attribute, DB_ID, COL_GLOBAL_DB, "vehicle_vin", 17, False)
create_attr(db.create_string_attribute, DB_ID, COL_GLOBAL_DB, "vehicle_registry", 20, False)
create_attr(db.create_string_attribute, DB_ID, COL_GLOBAL_DB, "shop_id", 36, False)

# Indicies for fast lookups and searches
create_idx("idx_job_card_id", "unique", ["job_card_id"])
create_idx("idx_vehicle_vin", "key", ["vehicle_vin"])
create_idx("idx_vehicle_registry", "key", ["vehicle_registry"])
create_idx("idx_vin_search", "fulltext", ["vehicle_vin"])
create_idx("idx_registry_search", "fulltext", ["vehicle_registry"])

print("Global DB setup complete!")
