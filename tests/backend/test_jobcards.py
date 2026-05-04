import sys
import os
sys.path.append(os.getcwd())
from app.core.appwrite_client import databases, DB_ID, COL_JOB_CARDS
result = databases.list_documents(DB_ID, COL_JOB_CARDS)
for d in result["documents"][:5]:
    print(f"ID: {d['$id']}, Reg: {d.get('vehicle_registry')}, Shop: {d.get('shop_id')}")
