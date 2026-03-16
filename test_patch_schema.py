import sys
import os
import time
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
load_dotenv(os.path.join(os.path.dirname(__file__), 'database_schema', '.env'))

from appwrite.client import Client
from appwrite.services.databases import Databases

client = Client()
client.set_endpoint(os.environ['APPWRITE_ENDPOINT'])
client.set_project(os.environ['APPWRITE_PROJECT_ID'])
client.set_key(os.environ['APPWRITE_API_KEY'])

db = Databases(client)

DB_ID = "699e2b3b00170fd7efb1"
COL = "mechanics"

attributes_response = db.list_attributes(DB_ID, COL)
existing = [a['key'] for a in attributes_response['attributes']]
print(f"Existing attributes: {existing}")

required_string = [
    ("first_name", 100), 
    ("last_name", 100), 
    ("email", 255), 
    ("hashed_password", 255), 
    ("shop_id", 36)
]

for key, size in required_string:
    if key not in existing:
        print(f"Creating string attribute {key}")
        db.create_string_attribute(DB_ID, COL, key, size, True)
        time.sleep(1)

if "active_status" not in existing:
    print("Creating active_status boolean attribute")
    db.create_boolean_attribute(DB_ID, COL, "active_status", required=True, default=None)

