# Communication Files – CarrySpanner

A reference list of all files responsible for cross-layer communication in the project.

---

## 1. Frontend ↔ Backend Communication

These files in the **frontend** make HTTP requests to the FastAPI backend.

| File | Path | Role |
|------|------|------|
| `client.ts` | `frontend/src/infrastructure/api/client.ts` | Base Axios/fetch client configured with the backend base URL and default headers for mechanic/ERP auth. |
| `shopClient.ts` | `frontend/src/infrastructure/api/shopClient.ts` | Separate API client configured for shop-specific requests (uses shop JWT token). |
| `useAuth.ts` | `frontend/src/presentation/hooks/useAuth.ts` | Hook that calls the ERP/mechanic auth endpoints (`/auth/login`, etc.) via `client.ts`. |
| `useShopAuth.ts` | `frontend/src/presentation/hooks/useShopAuth.ts` | Hook that calls the shop auth endpoints (`/auth/shop-login`, `/auth/shop-register`, etc.) and manages shop session state. |
| `useModules.ts` | `frontend/src/presentation/hooks/useModules.ts` | Hook that fetches module/subscription data from the backend via `client.ts` or `shopClient.ts`. |
| `authStore.ts` | `frontend/src/infrastructure/store/authStore.ts` | Zustand store that persists authentication tokens and user state used across API calls. |
| `vite.config.ts` | `frontend/vite.config.ts` | Vite config that defines the dev-server proxy rules, forwarding `/api` requests to the backend server. |

---

## 2. Backend ↔ Database Communication

These files in the **backend** interact directly with the Appwrite database.

| File | Path | Role |
|------|------|------|
| `appwrite_client.py` | `backend/app/core/appwrite_client.py` | Initialises and exposes the Appwrite SDK `Client` singleton and collection/DB ID constants used by all database operations. |
| `auth.py` (API) | `backend/app/api/v1/auth.py` | Endpoint handler for mechanic login; reads mechanic documents from Appwrite. |
| `shop_auth.py` | `backend/app/api/v1/shop_auth.py` | Endpoint handlers for shop registration and login; reads/writes shop documents in Appwrite. |
| `shops.py` | `backend/app/api/v1/shops.py` | CRUD endpoints for shop and mechanic management; reads/writes shop & mechanic collections. |
| `job_cards.py` | `backend/app/api/v1/job_cards.py` | CRUD endpoints for job cards; reads/writes the job-card collection in Appwrite. |
| `vehicles.py` | `backend/app/api/v1/vehicles.py` | CRUD endpoints for vehicles; reads/writes the vehicle collection in Appwrite. |
| `subscriptions.py` | `backend/app/api/v1/subscriptions.py` | Endpoints for module subscriptions; reads/writes subscription records in Appwrite. |
| `crm.py` | `backend/app/api/v1/crm.py` | Endpoints for customer & vehicle owner relationship management in Appwrite. |
| `global_db.py` | `backend/app/api/v1/global_db.py` | Endpoints for cross-shop job card queries and network vehicle history in Appwrite. |
| `security.py` | `backend/app/core/security.py` | JWT creation and verification helpers used to authenticate requests before DB access. |
| `shop_security.py` | `backend/app/core/shop_security.py` | Shop-specific JWT helpers (separate token scheme for shop admins). |

---

## 3. Database Setup & Seeding Scripts

These standalone scripts create and populate the Appwrite database (run once during setup).

| File | Path | Role |
|------|------|------|
| `setup_appwrite_db.py` | `database_schema/setup_appwrite_db.py` | Creates all Appwrite collections and attributes from scratch. |
| `migrations.py` | `database_schema/migrations.py` | Applies incremental schema migrations, creates global DB collection, and seeds subscription plans. |
| `global_databse.sql` | `database_schema/global_databse.sql` | SQL schema reference for the global database structure. |

