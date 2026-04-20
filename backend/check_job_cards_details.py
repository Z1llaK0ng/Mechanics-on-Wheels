import os, sys
sys.path.append(os.getcwd())
from app.core.appwrite_client import databases, DB_ID, COL_JOB_CARDS, COL_MECHANICS

# Output all job cards
res = databases.list_documents(DB_ID, COL_JOB_CARDS)
print(f"Total Job Cards found: {res['total']}")
for j in res['documents']:
    print(f"  ID: {j['$id']}")
    print(f"  vehicle_registry: {j.get('vehicle_registry')}")
    print(f"  upload_mechanic: {j.get('upload_mechanic')}")
    print(f"  shop_id: {j.get('shop_id')}")
    print("  ---")

# Also let's print all mechanics
print("Mechanics:")
res = databases.list_documents(DB_ID, COL_MECHANICS)
for m in res['documents']:
    print(f"  Email: {m.get('email')} -> Shop_id: {m.get('shop_id')} (Role: {m.get('role')})")
