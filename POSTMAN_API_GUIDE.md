# Mechanics-on-Wheels — Postman API Testing Guide

> **Base URL:** `http://localhost:8000`  
> **API Prefix:** `/api/v1`  
> All authenticated endpoints require: `Authorization: Bearer <token>` in the request header.

---

## ⚙️ Setup

1. Open Postman and create a new **Collection** called `Mechanics-on-Wheels`.
2. Add a **Collection Variable** called `base_url` with value `http://localhost:8000/api/v1`.
3. Add a **Collection Variable** called `token` (leave it empty — you'll fill it after login).
4. Make sure the backend server is running (`uvicorn app.main:app --reload` from the `backend/` folder).
5. You can also visit `http://localhost:8000/docs` for the interactive Swagger UI.

---

## 🔍 Health Checks (No Auth Required)

### 1. Root Check
- **Method:** `GET`
- **URL:** `http://localhost:8000/`
- **Expected Response:** `200 OK`
```json
{ "message": "Welcome to MechanicERP API", "version": "1.0.0", "status": "operational" }
```

### 2. Health Check
- **Method:** `GET`
- **URL:** `http://localhost:8000/health`
- **Expected Response:** `200 OK`
```json
{ "status": "healthy" }
```

---

## 🏪 SECTION 1 — Shop Authentication

### Step 1.1: Register a New Shop
- **Method:** `POST`
- **URL:** `{{base_url}}/auth/shop-register`
- **Body:** `raw → JSON`
```json
{
  "shop_name": "Kwame Auto Works",
  "location": "Accra, Ghana",
  "email": "kwame@autoworks.com",
  "password": "SecurePass123"
}
```
- **Expected:** `201 Created` — Returns the shop details with a `shop_id`.
- **Save the `shop_id`** as a Collection Variable for later use.

> ⚠️ Error `400`: Email or shop name already exists.

---

### Step 1.2: Login as Shop Admin
- **Method:** `POST`
- **URL:** `{{base_url}}/auth/shop-login`
- **Body:** `form-data` (NOT JSON — use `x-www-form-urlencoded`)

| Key        | Value                    |
|------------|--------------------------|
| `username` | `kwame@autoworks.com`    |
| `password` | `SecurePass123`          |
| `scope`    | `admin`                  |

- **Expected:** `200 OK`
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": "...",
    "role": "admin",
    "shopId": "...",
    "shopName": "Kwame Auto Works",
    "subscribedModules": []
  }
}
```
- **Copy the `access_token`** and set it as your `token` Collection Variable.

> ⚠️ Error `401`: Wrong email/password.

---

### Step 1.3: Login as Mechanic (ERP Staff Login)

> ⚠️ **Prerequisite:** A mechanic account must exist first. Create one via **Step 3.4** (admin adds mechanic) or **Step 2.1** (public self-registration) before testing this login.

- **Method:** `POST`
- **URL:** `{{base_url}}/auth/shop-login`
- **Body:** `x-www-form-urlencoded`

| Key        | Value                    |
|------------|--------------------------|
| `username` | `mechanic@email.com`     |
| `password` | `MechanicPass123`        |
| `scope`    | `mechanic`               |
| `shop_id`  | `<your_shop_id>`         |

- **Expected:** `200 OK` — Similar to admin login but includes `permittedModules` and `staffrole`.

> ⚠️ Error `422`: `shop_id` is required when `scope=mechanic`.

---

## 🔧 SECTION 2 — Mechanic Auth (ERP Portal)

> These endpoints use the **mechanic JWT** (from `/auth/login` below), not the shop-login token.

### Step 2.1: Create a Mechanic Account (Public Self-Registration)

Use this if a mechanic is registering themselves. Alternatively, the shop admin can create a mechanic account via **Step 3.4**.

- **Method:** `POST`
- **URL:** `{{base_url}}/auth/register`
- **Body:** `raw → JSON`
```json
{
  "first_name": "Kofi",
  "last_name": "Mensah",
  "email": "kofi@mechanic.com",
  "password": "Mechanic123",
  "shop_id": "<your_shop_id>"
}
```
- **Expected:** `201 Created` — Returns the new mechanic's profile including their `id`.
- **Save the mechanic `id`** as `mechanic_id` for use in further tests.

---

### Step 2.2: Mechanic Login (ERP Portal)
- **Method:** `POST`
- **URL:** `{{base_url}}/auth/login`
- **Body:** `x-www-form-urlencoded`

| Key        | Value                  |
|------------|------------------------|
| `username` | `kofi@mechanic.com`    |
| `password` | `Mechanic123`          |

- **Expected:** `200 OK` — Returns `access_token`.

---

### Step 2.3: Get Current Mechanic Profile
- **Method:** `GET`
- **URL:** `{{base_url}}/auth/me`
- **Header:** `Authorization: Bearer {{token}}`
- **Expected:** `200 OK` — Returns mechanic profile details.

---

## 🏬 SECTION 3 — Shop Management

> All endpoints below require **Admin token** in the `Authorization` header.

### Step 3.1: Update Shop Details
- **Method:** `PATCH`
- **URL:** `{{base_url}}/shops/<shop_id>`
- **Header:** `Authorization: Bearer {{token}}`
- **Body:** `raw → JSON`
```json
{
  "shop_name": "Kwame Auto Works Ltd",
  "location": "Kumasi, Ghana"
}
```
- **Expected:** `200 OK` — Updated shop info.

---

### Step 3.2: Change Shop Password
- **Method:** `PATCH`
- **URL:** `{{base_url}}/shops/<shop_id>/password`
- **Header:** `Authorization: Bearer {{token}}`
- **Body:** `raw → JSON`
```json
{
  "current_password": "SecurePass123",
  "new_password": "NewSecurePass456"
}
```
- **Expected:** `200 OK` — `{ "detail": "Password updated successfully." }`

---

### Step 3.3: List Shop Mechanics
- **Method:** `GET`
- **URL:** `{{base_url}}/shops/<shop_id>/mechanics`
- **Header:** `Authorization: Bearer {{token}}`
- **Expected:** `200 OK` — Array of mechanics in the shop.

---

### Step 3.4: Add a Mechanic to the Shop
- **Method:** `POST`
- **URL:** `{{base_url}}/shops/<shop_id>/mechanics`
- **Header:** `Authorization: Bearer {{token}}`
- **Body:** `raw → JSON`
```json
{
  "full_name": "Ama Boateng",
  "email": "ama@workshop.com",
  "password": "Staff123",
  "staffrole": "staff"
}
```
- **Expected:** `201 Created` — Returns the new mechanic's details.
- **Save the mechanic `id`** as `mechanic_id` for further tests.

> `staffrole` is either `"technician"` (default) or `"staff"`.

---

### Step 3.5: Toggle Mechanic Active Status (Enable/Disable)
- **Method:** `PATCH`
- **URL:** `{{base_url}}/shops/mechanics/<mechanic_id>`
- **Header:** `Authorization: Bearer {{token}}`
- **Body:** *(none)*
- **Expected:** `200 OK` — Returns updated mechanic with toggled `active_status`.

---

### Step 3.6: Change Mechanic Staff Role
- **Method:** `PATCH`
- **URL:** `{{base_url}}/shops/mechanics/<mechanic_id>/staffrole`
- **Header:** `Authorization: Bearer {{token}}`
- **Body:** `raw → JSON`
```json
{ "staffrole": "staff" }
```
- **Expected:** `200 OK`

> Valid values: `"technician"` or `"staff"`.

---

### Step 3.7: Update Mechanic Permitted Modules
- **Method:** `PATCH`
- **URL:** `{{base_url}}/shops/mechanics/<mechanic_id>/modules`
- **Header:** `Authorization: Bearer {{token}}`
- **Body:** `raw → JSON`
```json
{ "permitted_modules": ["job-cards_monthly", "vehicles_monthly"] }
```
- **Expected:** `200 OK` — Returns updated mechanic.

---

### Step 3.8: Delete a Mechanic
- **Method:** `DELETE`
- **URL:** `{{base_url}}/shops/mechanics/<mechanic_id>`
- **Header:** `Authorization: Bearer {{token}}`
- **Expected:** `204 No Content`

---

### Step 3.9: Get Module Groups for a Shop
- **Method:** `GET`
- **URL:** `{{base_url}}/shops/<shop_id>/module-groups`
- **Header:** `Authorization: Bearer {{token}}`
- **Expected:** `200 OK` — Array of prebuilt + custom module groups.

---

### Step 3.10: Create a Custom Module Group
- **Method:** `POST`
- **URL:** `{{base_url}}/shops/<shop_id>/module-groups`
- **Header:** `Authorization: Bearer {{token}}`
- **Body:** `raw → JSON`
```json
{
  "name": "Starter Pack",
  "desc": "Essential modules for small shops",
  "icon": "🔧",
  "module_ids": ["job-cards_monthly", "vehicles_monthly"],
  "price_monthly": 50,
  "price_yearly": 500
}
```
- **Expected:** `201 Created`

---

## 📋 SECTION 4 — Job Cards

> Requires a valid mechanic or admin **JWT token**.

### Step 4.1: Create a Job Card
- **Method:** `POST`
- **URL:** `{{base_url}}/job-cards`
- **Header:** `Authorization: Bearer {{token}}`
- **Body:** `raw → JSON`
```json
{
  "vehicle_vin": "1HGBH41JXMN109186",
  "vehicle_registry": "GR-1234-22",
  "parts_affected": ["Brake pads", "Oil filter"],
  "details": "Vehicle brought in for routine service."
}
```
- **Expected:** `201 Created` — Returns job card with `status: "pending"`.
- **Save the `job_card_id`** for further tests.

---

### Step 4.2: List All Job Cards
- **Method:** `GET`
- **URL:** `{{base_url}}/job-cards`
- **Header:** `Authorization: Bearer {{token}}`
- **Optional Query Params:**
  - `?vin=1HGBH41JXMN109186` — filter by VIN
  - `?registry=GR-1234-22` — filter by plate
  - `?status=pending` — filter by status (`pending`, `in-progress`, `completed`)
- **Expected:** `200 OK` — Array of job cards.

---

### Step 4.3: Get a Single Job Card
- **Method:** `GET`
- **URL:** `{{base_url}}/job-cards/<job_card_id>`
- **Header:** `Authorization: Bearer {{token}}`
- **Expected:** `200 OK`

---

### Step 4.4: Update a Job Card
- **Method:** `PUT`
- **URL:** `{{base_url}}/job-cards/<job_card_id>`
- **Header:** `Authorization: Bearer {{token}}`
- **Body:** `raw → JSON`
```json
{
  "details": "Replaced brake pads and changed engine oil.",
  "parts_affected": ["Brake pads", "Engine oil"]
}
```
- **Expected:** `200 OK`

---

### Step 4.5: Update Job Card Status
- **Method:** `PUT`
- **URL:** `{{base_url}}/job-cards/<job_card_id>/status?status=in-progress`
- **Header:** `Authorization: Bearer {{token}}`
- **Expected:** `200 OK`

> Valid status values: `pending`, `in-progress`, `completed`

---

### Step 4.6: Delete a Job Card
- **Method:** `DELETE`
- **URL:** `{{base_url}}/job-cards/<job_card_id>`
- **Header:** `Authorization: Bearer {{token}}`
- **Expected:** `204 No Content`

---

## 🚗 SECTION 5 — Vehicles

> Requires a valid **JWT token**.

### Step 5.1: Register a Vehicle
- **Method:** `POST`
- **URL:** `{{base_url}}/vehicles`
- **Header:** `Authorization: Bearer {{token}}`
- **Body:** `raw → JSON`
```json
{
  "registry": "GR-1234-22",
  "vin": "1HGBH41JXMN109186",
  "company": "Toyota",
  "brand": "Corolla",
  "owner_id": "optional-owner-id"
}
```
- **Expected:** `201 Created`

---

### Step 5.2: List Vehicles
- **Method:** `GET`
- **URL:** `{{base_url}}/vehicles`
- **Header:** `Authorization: Bearer {{token}}`
- **Optional Query Params:**
  - `?company=Toyota` — filter by make
  - `?active_only=true` — only active vehicles (default: `true`)
- **Expected:** `200 OK` — Array of vehicles.

---

### Step 5.3: Identify a Vehicle by VIN or Plate
- **Method:** `POST`
- **URL:** `{{base_url}}/vehicles/identify`
- **Header:** `Authorization: Bearer {{token}}`
- **Body:** `raw → JSON`
```json
{ "identifier": "GR-1234-22" }
```
- **Expected:** `200 OK` — Vehicle details. Works for both VIN and license plate.

---

### Step 5.4: Get Vehicle by License Plate
- **Method:** `GET`
- **URL:** `{{base_url}}/vehicles/GR-1234-22`
- **Header:** `Authorization: Bearer {{token}}`
- **Expected:** `200 OK`

---

### Step 5.5: Update Vehicle
- **Method:** `PUT`
- **URL:** `{{base_url}}/vehicles/GR-1234-22`
- **Header:** `Authorization: Bearer {{token}}`
- **Body:** `raw → JSON`
```json
{
  "company": "Toyota",
  "brand": "Camry"
}
```
- **Expected:** `200 OK`

---

### Step 5.6: Deactivate (Soft-Delete) a Vehicle
- **Method:** `DELETE`
- **URL:** `{{base_url}}/vehicles/GR-1234-22`
- **Header:** `Authorization: Bearer {{token}}`
- **Expected:** `204 No Content` — Sets `active_status = false`. Vehicle is NOT deleted from DB.

---

## 📦 SECTION 6 — Subscriptions

### Step 6.1: List All Available Subscription Plans
- **Method:** `GET`
- **URL:** `{{base_url}}/subscriptions/`
- **Header:** *(No auth required)*
- **Expected:** `200 OK` — All plans in the subscriptions collection.

---

### Step 6.2: Get My Shop's Active Subscriptions (Mechanic Token)
- **Method:** `GET`
- **URL:** `{{base_url}}/subscriptions/me`
- **Header:** `Authorization: Bearer {{token}}` *(mechanic or admin token)*
- **Expected:** `200 OK` — Active modules for the mechanic's shop.

---

### Step 6.3: Get Active Subscription IDs (Admin Token)
- **Method:** `GET`
- **URL:** `{{base_url}}/subscriptions/shop-active`
- **Header:** `Authorization: Bearer {{token}}` *(admin token only)*
- **Expected:** `200 OK`
```json
["job-cards_monthly", "vehicles_monthly"]
```

---

### Step 6.4: Activate a Subscription for the Shop
- **Method:** `POST`
- **URL:** `{{base_url}}/subscriptions/`
- **Header:** `Authorization: Bearer {{token}}` *(admin token)*
- **Body:** `raw → JSON`
```json
{ "subscription_id": "<subscription_plan_id_from_step_6.1>" }
```
- **Expected:** `201 Created` — `{ "detail": "Activated" }` or `{ "detail": "Already active" }`

---

### Step 6.5: Deactivate a Subscription
- **Method:** `DELETE`
- **URL:** `{{base_url}}/subscriptions/<subscription_id>`
- **Header:** `Authorization: Bearer {{token}}` *(admin token)*
- **Expected:** `204 No Content`

---

## 🔐 Common Auth Errors

| Status | Meaning                                    |
|--------|--------------------------------------------|
| `401`  | Missing/invalid/expired token              |
| `403`  | Valid token but wrong role/shop            |
| `422`  | Missing required fields                    |
| `404`  | Resource not found                         |
| `400`  | Duplicate resource (email, name, VIN, etc) |

---

## 🔄 Recommended Testing Order

1. **Register a shop** (1.1) → **Admin login** (1.2) → copy `shop_id` + `token`
2. **Create a mechanic account** — choose one:
   - Admin creates mechanic: **Step 3.4** *(recommended — admin sets role & password)*
   - Mechanic self-registers: **Step 2.1** *(requires knowing the `shop_id`)*
   - Copy the returned mechanic `id` as `mechanic_id`
3. **Mechanic login via ERP portal** (Step 1.3, `scope=mechanic`) → copy mechanic `token`
4. **Mechanic ERP login** (Step 2.2) → use if testing `/auth/login` instead of shop-login
5. **View mechanic profile** (Step 2.3) using the mechanic token
6. **Register a vehicle** (5.1) → **Identify vehicle** (5.3)
7. **Create a job card** (4.1) → **Update status** (4.5) → **List job cards** (4.2)
8. **List subscriptions** (6.1) → **Activate a subscription** (6.4) → **Check active** (6.3)
