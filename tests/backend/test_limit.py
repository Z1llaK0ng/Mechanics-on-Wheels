import os, sys, requests
sys.path.append(os.getcwd())

from app.core.security import create_access_token
from app.config import settings

# Create a token identical to what admin@chem1c.com would have
token = create_access_token({
    "sub": "admin@chem1c.com",
    "role": "admin",
    "shop_id": "69b4484c00018b9c508d",
    "shop_name": "Chem1c Auto"
})

url = "http://127.0.0.1:8000/api/v1/job-cards?limit=100"
headers = {"Authorization": f"Bearer {token}"}
r = requests.get(url, headers=headers)
print("Status limit=100:", r.status_code)
if r.status_code == 200:
    print("Found:", len(r.json()))
else:
    print(r.text)

url2 = "http://127.0.0.1:8000/api/v1/job-cards?limit=200"
r2 = requests.get(url2, headers=headers)
print("Status limit=200:", r2.status_code)
if r2.status_code != 200:
    print(r2.text)
