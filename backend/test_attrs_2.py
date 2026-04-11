from app.core.appwrite_client import db as databases, DB_ID, COL_MECHANICS

try:
    attrs = databases.list_attributes(DB_ID, COL_MECHANICS)
    print("KEYS:", [a['key'] for a in attrs['attributes']])
except Exception as e:
    print('ERROR:', e)
