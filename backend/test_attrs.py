import os
from dotenv import load_dotenv
from appwrite.client import Client
from appwrite.services.databases import Databases

load_dotenv(dotenv_path='../database_schema/.env')
client = Client()
client.set_endpoint(os.environ["APPWRITE_ENDPOINT"])
client.set_project(os.environ["APPWRITE_PROJECT_ID"])
client.set_key(os.environ["APPWRITE_API_KEY"])
db = Databases(client)

try:
    attrs = db.list_attributes(os.environ.get("APPWRITE_DB_ID", "global-erp"), 'mechanics')
    print([a['key'] for a in attrs['attributes']])
except Exception as e:
    print('ERROR:', e)
