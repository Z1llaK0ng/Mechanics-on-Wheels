import os
import time
from dotenv import load_dotenv
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.query import Query

load_dotenv()
client = Client()
client.set_endpoint(os.environ["APPWRITE_ENDPOINT"])
client.set_project(os.environ["APPWRITE_PROJECT_ID"])
client.set_key(os.environ["APPWRITE_API_KEY"])
db = Databases(client)

DB_ID = os.environ["APPWRITE_DB_ID"]
COL = "job-cards"

print(f"Adding is_global to {COL}...")
try:
    db.create_boolean_attribute(DB_ID, COL, "is_global", False, default=False)
except Exception as e:
    print(f"Skipped creation: {e}")

time.sleep(3)

print("Backfilling existing job cards...")
offset = 0
limit = 100
filled = 0

while True:
    result = db.list_documents(DB_ID, COL, queries=[Query.limit(limit), Query.offset(offset)])
    docs = result["documents"]
    if not docs:
        break
    for doc in docs:
        if doc.get("is_global") is None:
            # If shop_id is not empty, it was globally shared before 
            is_global = bool(doc.get("shop_id"))
            db.update_document(DB_ID, COL, doc["$id"], {"is_global": is_global})
            filled += 1
        time.sleep(0.1)
    offset += len(docs)
    if len(docs) < limit:
        break

print(f"Done! Backfilled: {filled}")
