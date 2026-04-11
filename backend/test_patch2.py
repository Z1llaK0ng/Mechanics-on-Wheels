import requests

# 1. Login
login_data = {
    'username': 'manager@demo.com',
    'password': 'manager',
    'scope': 'admin'
}
r1 = requests.post('http://localhost:8000/api/v1/auth/shop-login', data=login_data)
token = r1.json().get('access_token')

if not token:
    print("Login failed:", r1.text)
    exit(1)

# 2. Get mechanics
r2 = requests.get('http://localhost:8000/api/v1/shops/pr3bu1lt/mechanics', headers={'Authorization': f'Bearer {token}'})
mechanics = r2.json()

if not mechanics:
    print("No mechanics found")
    exit(1)

mec_id = mechanics[0]['id']

# 3. Patch permission
payload = {'can_push_global_db': True}
r3 = requests.patch(f'http://localhost:8000/api/v1/shops/mechanics/{mec_id}/global-db-push', json=payload, headers={'Authorization': f'Bearer {token}'})

print('STATUS:', r3.status_code)
print('BODY:', r3.text)
