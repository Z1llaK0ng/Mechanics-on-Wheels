import os, sys
sys.path.append(os.getcwd())
from app.core.appwrite_client import databases, DB_ID, COL_SHOP

res = databases.list_documents(DB_ID, COL_SHOP)
for s in res['documents']:
    print(f"Shop ID: {s['$id']} | Name: {s.get('name')}")
