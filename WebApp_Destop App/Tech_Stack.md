# Tech Stack – CarrySpanner (Live Website)

A reference for every language, framework, library, API, and tool used in the active codebase.

---

## 🖥️ Programming Languages

| Language | Version | Where used |
|----------|---------|-----------|
| **TypeScript** | 5.2+ | All frontend source code (`frontend/src/`) |
| **Python** | 3.11+ | All backend source code (`backend/`) |
| **SQL** | — | Database schema reference files (`database_schema/*.sql`) |
| **HTML** | 5 | Base document (`frontend/index.html`) |
| **CSS** | 3 | Global styles (`frontend/src/index.css`) |

---

## 🗄️ Database & Storage

| Technology | Role |
|-----------|------|
| **Appwrite** | Cloud backend-as-a-service used as the primary database. Stores all collections: shops, mechanics, vehicles, job cards, subscriptions, and active subscriptions. |
| **Appwrite SDK for Python** | Used in the FastAPI backend to read and write all Appwrite documents (`appwrite` Python package). |

---

## ⚙️ Backend Framework & Libraries

| Package | Version | Role |
|---------|---------|------|
| **FastAPI** | 0.128.0 | Main web framework — defines all REST API routes |
| **Uvicorn** | 0.40.0 | ASGI server that runs the FastAPI application |
| **Pydantic** | 2.12.5 | Data validation and serialisation for request/response models |
| **Pydantic Settings** | 2.7.1 | Loads and validates environment variables from `.env` |
| **python-jose[cryptography]** | 3.3.0 | JWT creation and verification (auth tokens) |
| **passlib[bcrypt]** | 1.7.4 | Secure password hashing and verification |
| **python-multipart** | 0.0.9 | Parses form data (used by the login endpoint) |
| **SQLAlchemy** | 2.0.46 | ORM (included in requirements; available for relational DB use) |
| **PyMySQL** | 1.1.0 | MySQL driver (available for relational DB use) |
| **Starlette** | 0.50.0 | ASGI toolkit underpinning FastAPI (middleware, routing) |
| **anyio** | 4.12.1 | Async I/O support |
| **python-dotenv** | — | Loads `.env` files for local development |

---

## 🌐 Frontend Framework & Libraries

| Package | Version | Role |
|---------|---------|------|
| **React** | 18.2.0 | Core UI library |
| **React DOM** | 18.2.0 | Renders React components to the browser DOM |
| **React Router DOM** | 6.22.0 | Client-side routing (`router.tsx` URL → Page mapping) |
| **Zustand** | 4.5.0 | Lightweight global state management (auth tokens, session) |
| **TanStack Query (React Query)** | 5.20.0 | Server state management — fetching, caching, and syncing API data |
| **Axios** | 1.6.7 | HTTP client used to make requests to the FastAPI backend |

---

## 🔧 Frontend Build Tools & Dev Dependencies

| Package | Version | Role |
|---------|---------|------|
| **Vite** | 5.1.0 | Development server and production bundler |
| **@vitejs/plugin-react** | 4.2.1 | Vite plugin for React (JSX transform, Fast Refresh) |
| **vite-plugin-pwa** | 0.19.0 | Generates the PWA service worker and web manifest |
| **Workbox Window** | 7.0.0 | Runtime library for PWA service worker lifecycle management |
| **TypeScript** | 5.2.2 | Static type checking across all frontend code |
| **ESLint** | 8.56.0 | Code linting with React-specific rules |

---

## 🔌 APIs & External Services

| API / Service | Type | Role |
|--------------|------|------|
| **Appwrite REST API** | External SaaS (Cloud) | All database operations (create, read, update, delete documents and collections) |
| **Appwrite Python SDK** | SDK over REST | Wraps Appwrite API calls in the backend (`appwrite_client.py`) |
| **FastAPI (Internal REST API)** | Self-hosted | The backend's own REST API consumed by the frontend. Versioned under `/api/v1` |
| **JWT (Bearer tokens)** | Auth standard (RFC 7519) | Stateless authentication — issued on login, sent with every subsequent request |
| **Browser PWA / Service Worker API** | Web standard | Enables offline capability and home-screen installation of the frontend |

---

## 🛡️ Authentication & Security

| Mechanism | Detail |
|-----------|--------|
| **JWT (JSON Web Tokens)** | Issued on login via `python-jose`. Payload carries `role`, `shop_id`, `mechanic_id`, and `subscribedModules`. |
| **bcrypt password hashing** | All passwords are hashed with `passlib[bcrypt]` before storage. Plain-text passwords are never saved. |
| **Two token scopes** | `admin` tokens (shop admins) and `mechanic` tokens are handled by separate security modules (`security.py` and `shop_security.py`). |
| **Shop-level data isolation** | Every protected endpoint verifies that the requester's `shop_id` matches the resource they are accessing. |

---

## 📦 Runtime Environments

| Environment | Tool |
|-------------|------|
| **Backend runtime** | Python 3.11+ in a `venv` virtual environment |
| **Frontend runtime** | Node.js + Vite dev server (development) / static files (production) |
| **Package managers** | `pip` (backend) · `npm` (frontend) |
