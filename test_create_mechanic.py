import sys
import os
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
load_dotenv(os.path.join(os.path.dirname(__file__), 'database_schema', '.env'))

from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.id import ID

client = Client()
client.set_endpoint(os.environ['APPWRITE_ENDPOINT'])
client.set_project(os.environ['APPWRITE_PROJECT_ID'])
client.set_key(os.environ['APPWRITE_API_KEY'])

db = Databases(client)

try:
    doc = db.create_document(
        database_id="699e2b3b00170fd7efb1",
        collection_id="mechanics",
        document_id=ID.unique(),
        data={
            "first_name": "John",
            "last_name": "Doe",
            "email": "johndoe789@example.gh",
            "hashed_password": "some_bcrypt_hash",
            "shop_id": "shop_test",
            "active_status": True,
        }
    )
    print("Success:", doc)
except Exception as e:
    print("Error:", str(e))
