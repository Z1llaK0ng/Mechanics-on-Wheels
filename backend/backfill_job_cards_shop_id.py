import os
import sys
import time

# Set up paths 
sys.path.append(os.getcwd())

from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.query import Query

from app.config import settings
from app.core.appwrite_client import DB_ID, COL_JOB_CARDS, COL_MECHANICS

# Initialize Appwrite client directly to bypass FastAPI depends locally
client = Client()
client.set_endpoint(settings.APPWRITE_ENDPOINT)
client.set_project(settings.APPWRITE_PROJECT_ID)
client.set_key(settings.APPWRITE_API_KEY)

db = Databases(client)

def backfill_job_cards_shop_id():
    print("Fetching mechanics to build mechanic_id -> shop_id mapping...")
    mechanics_map = {}
    offset = 0
    while True:
        res = db.list_documents(DB_ID, COL_MECHANICS, [Query.limit(100), Query.offset(offset)])
        for m in res["documents"]:
            if m.get("shop_id"):
                mechanics_map[m["$id"]] = m["shop_id"]
        if len(res["documents"]) < 100:
            break
        offset += len(res["documents"])

    print(f"Found {len(mechanics_map)} mechanics with a shop_id.")

    print("Fetching legacy job cards without a shop_id...")
    offset = 0
    updated = 0
    skipped = 0
    
    while True:
        res = db.list_documents(DB_ID, COL_JOB_CARDS, [Query.limit(100), Query.offset(offset)])
        docs = res["documents"]
        if not docs:
            break
        
        for jc in docs:
            if not jc.get("shop_id"):
                mechanic_id = jc.get("upload_mechanic")
                if mechanic_id in mechanics_map:
                    new_shop_id = mechanics_map[mechanic_id]
                    # Update job card
                    db.update_document(DB_ID, COL_JOB_CARDS, jc["$id"], {"shop_id": new_shop_id})
                    print(f"Updated JS {jc['$id']} (from mechanic {mechanic_id}) -> shop {new_shop_id}")
                    updated += 1
                else:
                    skipped += 1
            else:
                skipped += 1
                
        offset += len(docs)
        if len(docs) < 100:
            break

    print(f"Done. Updated: {updated}, Skipped/Already OK: {skipped}")

if __name__ == '__main__':
    backfill_job_cards_shop_id()
