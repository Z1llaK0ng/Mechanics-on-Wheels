import os
import time
from dotenv import load_dotenv
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.query import Query

load_dotenv()
ENDPOINT = os.environ["APPWRITE_ENDPOINT"]
PROJECT_ID = os.environ["APPWRITE_PROJECT_ID"]
API_KEY = os.environ["APPWRITE_API_KEY"]
DB_ID = os.environ["APPWRITE_DB_ID"]

client = Client()
client.set_endpoint(ENDPOINT)
client.set_project(PROJECT_ID)
client.set_key(API_KEY)
db = Databases(client)

COL = "mechanics"

print(f"Adding can_push_global_db to {COL} in db {DB_ID}...")
try:
    db.create_boolean_attribute(DB_ID, COL, "can_push_global_db", False, default=False)
except Exception as e:
    print(f"Skipped creation: {e}")

time.sleep(3)

print("Backfilling existing mechanics...")
offset = 0
limit = 100
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

print(f"Done! Backfilled: {filled}, Skipped: {skipped}")
