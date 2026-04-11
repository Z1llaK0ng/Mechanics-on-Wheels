import requests
import time

URL = "http://localhost:8000/api/v1"

# 1. Login
r = requests.post(f"{URL}/auth/login", data={"email": "johndoe@pr3bu1lt.com", "password": "password123"})
if r.status_code != 200:
    print(f"Login failed: {r.text}")
    print("Trying another mechanic...")
    r = requests.post(f"{URL}/auth/login", data={"email": "nana@pr3bu1lt.com", "password": "password123"})
    if r.status_code != 200:
        exit(1)

token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

print("Logged in!")

# 2. Add job card
r = requests.post(f"{URL}/job-cards", headers=headers, json={
    "vehicle_vin": "TESTVIN123",
    "vehicle_registry": "TEST-REG",
    "parts_affected": "Test",
    "details": "Testing global DB integration"
})
print("Create Job Card:", r.status_code)
if r.status_code == 201:
    jid = r.json()["job_card_id"]
    print("Created ID:", jid)
    print("Initial is_uploaded:", r.json()["is_uploaded"])

    # 3. Check it appears locally
    r2 = requests.get(f"{URL}/job-cards", headers=headers)
    print("Local list status:", r2.status_code)
    for c in r2.json():
        if c["job_card_id"] == jid:
            print("Found locally. is_uploaded:", c.get("is_uploaded"))

    # 4. Upload it
    print("Tagging... (admin/mechanic push perm required)")
    r3 = requests.patch(f"{URL}/job-cards/tag-shop-id", headers=headers, json={"job_card_ids": [jid]})
    print("Tag status:", r3.status_code, r3.text)

    if r3.status_code == 200:
        # 5. Check global DB
        r4 = requests.get(f"{URL}/global-db", headers=headers)
        print("Global DB list fetched.")
        found = any(c["job_card_id"] == jid for c in r4.json())
        print("Is it in Global DB?", found)

        # 6. Untag it
        r5 = requests.patch(f"{URL}/job-cards/untag-shop-id", headers=headers, json={"job_card_ids": [jid]})
        print("Untag status:", r5.status_code, r5.text)

        # 7. Check local again
        r6 = requests.get(f"{URL}/job-cards", headers=headers)
        for c in r6.json():
            if c["job_card_id"] == jid:
                print("Still local? is_uploaded:", c.get("is_uploaded"))
        
    requests.delete(f"{URL}/job-cards/{jid}", headers=headers)
    print("Deleted test job card.")
