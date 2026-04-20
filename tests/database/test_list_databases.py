import sys
import os
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
load_dotenv(os.path.join(os.path.dirname(__file__), 'database_schema', '.env'))

from appwrite.client import Client
from appwrite.services.tables_db import TablesDB

client = Client()
client.set_endpoint(os.environ['APPWRITE_ENDPOINT'])
client.set_project(os.environ['APPWRITE_PROJECT_ID'])
client.set_key(os.environ['APPWRITE_API_KEY'])

db = TablesDB(client)
res = db.list()
for d in res['databases']:
    print(f"Name: {d['name']}, ID: {d['$id']}")
