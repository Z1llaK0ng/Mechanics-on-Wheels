# Project File Structure – CarrySpanner

> Excludes: `node_modules/`, `venv/`, `.git/`, `__pycache__/`, `.vscode/`

---

## 🌐 Group 1 — Live Website (Active Codebase)

The three folders that directly power the running application.

---

### 🏗️ Fixed Architecture Skeleton

These are the folders that **never change** no matter what new features or modules are added. Every new file created for the app slots into one of these existing directories.

#### How the Layers Connect

```mermaid
flowchart TD
    DB[("☁️ Appwrite Database")]

    subgraph SCHEMA["database_schema/"]
        S1["setup_appwrite_db.py\nCreates collections once"]
        S2["migrations.py\nSchema updates & seeds data"]
    end

    subgraph BACKEND["backend/app/"]
        CORE["core/\nAppwrite client · DB IDs · JWT security"]
        SCHEMAS["schemas/\nPydantic request/response & domain models"]
        API["api/v1/\nREST endpoint handlers\n(the actual routes)"]
        MAIN_B["main.py + config.py\nApp factory · env vars · middleware"]
    end

    subgraph FRONTEND["frontend/src/"]
        INFRA["infrastructure/\nAPI clients · Auth state store"]
        DOMAIN_F["domain/\nShared TypeScript types"]
        HOOKS["presentation/hooks/\nData-fetching logic"]
        COMPONENTS["presentation/components/\nReusable layout components"]
        PAGES["presentation/pages/\nFull page views (erp/ · shop/)"]
        ROUTER["router.tsx\nURL → Page mapping"]
    end

    SCHEMA -- "runs once at setup" --> DB
    DB -- "read / write" --> CORE
    CORE --> API
    SCHEMAS --> API
    MAIN_B --> API

    API -- "HTTP JSON" --> INFRA
    INFRA --> HOOKS
    DOMAIN_F --> HOOKS
    HOOKS --> PAGES
    COMPONENTS --> PAGES
    ROUTER --> PAGES
```

#### Fixed Folder Reference

| Layer | Fixed Folder | What goes here | Changes? |
|-------|-------------|----------------|----------|
| **DB Setup** | `database_schema/` | Setup & migration scripts to create & seed the DB | ➕ New migration functions added here for new collections |
| **Backend – Core** | `backend/app/core/` | Appwrite client singleton, DB ID constants, JWT helpers | 🔒 Rarely changes — infrastructure only |
| **Backend – Schemas** | `backend/app/schemas/` | Pydantic classes defining domain entities, API request/response shapes | ➕ New schema file per entity/endpoint group |
| **Backend – API** | `backend/app/api/v1/` | FastAPI route handlers (the actual endpoints) | ➕ New `.py` file per new feature area |
| **Backend – Config** | `backend/app/config.py` | Env vars & app-wide settings | 🔒 Only grows when new env vars are added |
| **Frontend – Types** | `frontend/src/domain/` | TypeScript interfaces & types shared across the app | ➕ Grows as new data types are needed |
| **Frontend – Clients** | `frontend/src/infrastructure/api/` | Axios/fetch clients configured with auth tokens | 🔒 Only changes if auth strategy changes |
| **Frontend – Store** | `frontend/src/infrastructure/store/` | Zustand global state (auth tokens, session) | 🔒 Only grows if new global state is needed |
| **Frontend – Hooks** | `frontend/src/presentation/hooks/` | Hooks that call the API clients | ➕ New hook file per new data operation |
| **Frontend – Components** | `frontend/src/presentation/components/` | Shared layout wrappers (Navbar, Sidebar, etc.) | ➕ New file only for reusable UI primitives |
| **Frontend – Pages** | `frontend/src/presentation/pages/` | Full page views, organized under `erp/` and `shop/` | ➕ New page file per new screen |
| **Frontend – Router** | `frontend/src/router.tsx` | URL-to-page route definitions | ➕ One new line per new page added |

> 🔒 = Structural skeleton, stays stable &nbsp;&nbsp; ➕ = Fixed folder, but new files are added into it as the app grows

---

### 📂 Full File Tree

```
CarrySpanner/
│
├── database_schema/                        # DB setup, seeding & SQL schemas
│   ├── setup_appwrite_db.py                # Creates Appwrite collections & attributes
│   ├── migrations.py                       # Incremental schema changes & data seeding
│   ├── global_databse.sql                  # Global DB SQL schema reference
│   └── unified_database_uml.png            # Visual database ER diagram
│
├── backend/                                # FastAPI backend
│   ├── main.py  →  app/main.py
│   ├── requirements.txt
│   ├── pyrightconfig.json
│   ├── .env / .env.example
│   │
│   └── app/
│       ├── main.py                         # FastAPI app factory & middleware
│       ├── config.py                       # Environment variable settings
│       │
│       ├── core/                           # Shared infrastructure
│       │   ├── appwrite_client.py          # Appwrite SDK client singleton & DB constants
│       │   ├── security.py                 # JWT creation & verification (mechanics)
│       │   └── shop_security.py            # JWT helpers (shop admins)
│       │
│       ├── api/
│       │   └── v1/                         # REST API endpoints (v1)
│       │       ├── router.py               # Registers all sub-routers
│       │       ├── auth.py                 # POST /auth/login  (mechanic login)
│       │       ├── shop_auth.py            # POST /auth/shop-login|register
│       │       ├── shops.py                # CRUD /shops  (shop & mechanic mgmt)
│       │       ├── job_cards.py            # CRUD /job-cards
│       │       ├── vehicles.py             # CRUD /vehicles
│       │       ├── subscriptions.py        # CRUD /subscriptions
│       │       ├── crm.py                  # CRUD /crm (customer profiles)
│       │       └── global_db.py            # GET /global-db (cross-shop records)
│       │
│       └── schemas/                        # Request/response & domain Pydantic schemas
│           ├── auth.py
│           ├── customer.py
│           ├── job_card.py
│           ├── mechanic.py
│           ├── shop.py
│           └── vehicle.py
│
├── frontend/                               # React + TypeScript frontend (Vite)
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json / tsconfig.node.json
│   ├── vite.config.ts                      # Dev-server proxy → backend
│   ├── .env.example
│   │
│   └── src/
│       ├── main.tsx                        # React app entry point
│       ├── App.tsx                         # Root component
│       ├── router.tsx                      # React Router route definitions
│       ├── index.css                       # Global styles
│       │
│       ├── domain/
│       │   └── types.ts                    # Shared TypeScript types
│       │
│       ├── infrastructure/                 # External-facing adapters
│       │   ├── api/
│       │   │   ├── client.ts               # Base API client (mechanic/ERP auth)
│       │   │   └── shopClient.ts           # API client (shop admin auth)
│       │   └── store/
│       │       └── authStore.ts            # Zustand auth state store
│       │
│       └── presentation/                   # UI layer
│           ├── components/
│           │   ├── AppLayout.tsx
│           │   ├── ShopLayout.tsx
│           │   ├── Navbar.tsx
│           │   └── Sidebar.tsx
│           │
│           ├── hooks/
│           │   ├── useAuth.ts              # Mechanic/ERP auth hook
│           │   ├── useShopAuth.ts          # Shop admin auth hook
│           │   ├── useModules.ts           # Module/subscription data hook
│           │   └── usePWAInstall.ts        # PWA install prompt hook
│           │
│           └── pages/
│               ├── LandingPage.tsx         # Public landing page  (route: /)
│               │
│               ├── erp/                    # Mechanic-facing pages
│               │   ├── LoginPage.tsx
│               │   ├── DashboardPage.tsx
│               │   ├── JobCardsPage.tsx
│               │   ├── VehiclesPage.tsx
│               │   ├── ModulesPage.tsx
│               │   ├── CrmPage.tsx
│               │   ├── GlobalDbPage.tsx
│               │   └── PWADownloadPage.tsx
│               │
│               └── shop/                   # Shop-admin-facing pages
│                   ├── ShopLoginPage.tsx
│                   ├── ShopRegisterPage.tsx
│                   ├── ShopSettingsPage.tsx
│                   ├── ShopMarketplacePage.tsx
│                   ├── ShopSubscriptionPage.tsx
│                   ├── ShopManagementPage.tsx
│                   ├── ShopModuleWrapper.tsx
│                   └── MechanicModulesPage.tsx
│
└── tests/                                  # Automated & E2E Test Suite
    ├── POSTMAN_API_GUIDE.md                # Postman integration testing guide
    ├── backend/                            # pytest backend API integration tests
    │   ├── test_api.py
    │   ├── test_jobcards.py
    │   ├── test_limit.py
    │   ├── test_patch.py
    │   └── test_patch2.py
    └── frontend/                           # Playwright E2E frontend integration test
        └── test_frontend.py
```

---

## 📄 Group 2 — Documentation & Reference (Theoretical)

Files that describe, plan, or document the project — not executed at runtime.

```
CarrySpanner/
│
├── README.md                               # Top-level project overview
├── page_flow.md                            # Architecture page flow & routing diagram
│
└── WebApp_Destop App/                      # Design docs & visual assets
    ├── Readme.MD
    ├── Communication_Files.md              # Map of communicator files
    ├── File_Structure.md                   # This file
    ├── Tech_Stack.md                       # Technologies & dependencies reference
    ├── Testing_Overview.md                 # Testing strategy overview
    ├── Test_logins.md                      # Standardized test persona credentials
    ├── Use_Cases.md                        # User flows & Mermaid activity diagrams
    └── first_look/
        └── Website/                        # Early UI screenshots / mockups
```

---

## 🧪 Group 3 — Prototype (Early Exploration)

The original Python prototype built before the current web architecture was chosen.

```
CarrySpanner/
│
└── Python wireframe/
    ├── wireframe.py                        # Initial UI / flow prototype
    ├── dbconnect.py                        # Early DB connection experiment
    ├── identifier.py                       # Utility script
    └── testFile.csv                        # Sample data used during prototyping
```

---

## 🗂️ Detailed File Master List

| Category | File Path | File Name | Description |
|----------|-----------|-----------|-------------|
| Backend | `backend/.env.example` | `.env.example` | Environment variables template / configuration |
| Backend | `backend/.env` | `.env` | Environment variables configuration |
| Backend | `backend/app/__init__.py` | `__init__.py` | Python module indicator |
| Backend | `backend/app/api/__init__.py` | `__init__.py` | Python module indicator |
| Backend | `backend/app/api/v1/__init__.py` | `__init__.py` | Python module indicator |
| Backend | `backend/app/api/v1/auth.py` | `auth.py` | FastAPI endpoint handlers for mechanic auth |
| Backend | `backend/app/api/v1/crm.py` | `crm.py` | FastAPI endpoint handlers for CRM & customer records |
| Backend | `backend/app/api/v1/global_db.py` | `global_db.py` | FastAPI endpoint handlers for global database |
| Backend | `backend/app/api/v1/job_cards.py` | `job_cards.py` | FastAPI endpoint handlers for job_cards |
| Backend | `backend/app/api/v1/router.py` | `router.py` | API router aggregator for v1 |
| Backend | `backend/app/api/v1/shop_auth.py` | `shop_auth.py` | FastAPI endpoint handlers for shop_auth |
| Backend | `backend/app/api/v1/shops.py` | `shops.py` | FastAPI endpoint handlers for shops |
| Backend | `backend/app/api/v1/subscriptions.py` | `subscriptions.py` | FastAPI endpoint handlers for subscriptions |
| Backend | `backend/app/api/v1/vehicles.py` | `vehicles.py` | FastAPI endpoint handlers for vehicles |
| Backend | `backend/app/config.py` | `config.py` | Environment variables loader (Pydantic BaseSettings) |
| Backend | `backend/app/core/__init__.py` | `__init__.py` | Python module indicator |
| Backend | `backend/app/core/appwrite_client.py` | `appwrite_client.py` | Appwrite client setup, database constants, and helper functions |
| Backend | `backend/app/core/security.py` | `security.py` | JWT creation and validation logic for mechanics |
| Backend | `backend/app/core/shop_security.py` | `shop_security.py` | JWT creation and validation logic for shop admins |
| Backend | `backend/app/main.py` | `main.py` | FastAPI application factory and middleware |
| Backend | `backend/app/schemas/__init__.py` | `__init__.py` | Python module indicator |
| Backend | `backend/app/schemas/auth.py` | `auth.py` | Pydantic schema definitions for auth endpoints |
| Backend | `backend/app/schemas/customer.py` | `customer.py` | Pydantic schema definitions for CRM customer endpoints |
| Backend | `backend/app/schemas/job_card.py` | `job_card.py` | Pydantic schema definitions for job_card endpoints |
| Backend | `backend/app/schemas/mechanic.py` | `mechanic.py` | Pydantic schema definitions for mechanic endpoints |
| Backend | `backend/app/schemas/shop.py` | `shop.py` | Pydantic schema definitions for shop endpoints |
| Backend | `backend/app/schemas/vehicle.py` | `vehicle.py` | Pydantic schema definitions for vehicle endpoints |
| Backend | `backend/pyrightconfig.json` | `pyrightconfig.json` | Python strict type-checking configuration |
| Backend | `backend/requirements.txt` | `requirements.txt` | Python PyPI dependencies |
| Database | `database_schema/.env` | `.env` | Environment variables configuration |
| Database | `database_schema/global_databse.sql` | `global_databse.sql` | SQL schema design reference |
| Database | `database_schema/migrations.py` | `migrations.py` | Database schema migration and data seeding script |
| Database | `database_schema/setup_appwrite_db.py` | `setup_appwrite_db.py` | Appwrite database/collection initialization script |
| Database | `database_schema/unified_database_uml.png` | `unified_database_uml.png` | Visual UML diagram reference |
| Frontend | `frontend/.env.example` | `.env.example` | Environment variables template / configuration |
| Frontend | `frontend/index.html` | `index.html` | Base HTML application shell template |
| Frontend | `frontend/package-lock.json` | `package-lock.json` | NPM dependencies lock file |
| Frontend | `frontend/package.json` | `package.json` | NPM dependencies and project scripts |
| Frontend | `frontend/src/App.tsx` | `App.tsx` | Root React Layout component |
| Frontend | `frontend/src/domain/types.ts` | `types.ts` | Global TypeScript architecture types and interfaces |
| Frontend | `frontend/src/index.css` | `index.css` | Global base CSS and styling |
| Frontend | `frontend/src/infrastructure/api/client.ts` | `client.ts` | Axios client interceptors for mechanic/ERP auth |
| Frontend | `frontend/src/infrastructure/api/shopClient.ts` | `shopClient.ts` | Axios client interceptors for shop admin auth |
| Frontend | `frontend/src/infrastructure/store/authStore.ts` | `authStore.ts` | Zustand global auth state store |
| Frontend | `frontend/src/main.tsx` | `main.tsx` | Vite React application bootstrap entrypoint |
| Frontend | `frontend/src/presentation/components/AppLayout.tsx` | `AppLayout.tsx` | Direct ERP layout frame component |
| Frontend | `frontend/src/presentation/components/Navbar.tsx` | `Navbar.tsx` | Shared top navigation bar component |
| Frontend | `frontend/src/presentation/components/ShopLayout.tsx` | `ShopLayout.tsx` | Shop portal sidebar layout frame component |
| Frontend | `frontend/src/presentation/components/Sidebar.tsx` | `Sidebar.tsx` | Shared ERP sidebar navigation component |
| Frontend | `frontend/src/presentation/hooks/useAuth.ts` | `useAuth.ts` | React auth hook for mechanic API actions |
| Frontend | `frontend/src/presentation/hooks/useModules.ts` | `useModules.ts` | React hook for module & subscription API data |
| Frontend | `frontend/src/presentation/hooks/usePWAInstall.ts` | `usePWAInstall.ts` | React hook for PWA installation prompt handling |
| Frontend | `frontend/src/presentation/hooks/useShopAuth.ts` | `useShopAuth.ts` | React auth hook for shop admin API actions |
| Frontend | `frontend/src/presentation/pages/LandingPage.tsx` | `LandingPage.tsx` | Public-facing website landing page |
| Frontend | `frontend/src/presentation/pages/erp/CrmPage.tsx` | `CrmPage.tsx` | Customer Relationship Management page component |
| Frontend | `frontend/src/presentation/pages/erp/DashboardPage.tsx` | `DashboardPage.tsx` | Mechanic ERP dashboard component |
| Frontend | `frontend/src/presentation/pages/erp/GlobalDbPage.tsx` | `GlobalDbPage.tsx` | Cross-shop Global Database page component |
| Frontend | `frontend/src/presentation/pages/erp/JobCardsPage.tsx` | `JobCardsPage.tsx` | Job cards management page component |
| Frontend | `frontend/src/presentation/pages/erp/ModulesPage.tsx` | `ModulesPage.tsx` | Subscribed modules portal page |
| Frontend | `frontend/src/presentation/pages/erp/PWADownloadPage.tsx` | `PWADownloadPage.tsx` | Offline PWA installation guide page |
| Frontend | `frontend/src/presentation/pages/erp/VehiclesPage.tsx` | `VehiclesPage.tsx` | Vehicle registry management page component |
| Frontend | `frontend/src/presentation/pages/logins/LoginPage.tsx` | `LoginPage.tsx` | Direct ERP mechanic authentication screen |
| Frontend | `frontend/src/presentation/pages/logins/ShopLoginPage.tsx` | `ShopLoginPage.tsx` | Shop admin / staff portal authentication screen |
| Frontend | `frontend/src/presentation/pages/logins/ShopRegisterPage.tsx` | `ShopRegisterPage.tsx` | Shop admin registration screen |
| Frontend | `frontend/src/presentation/pages/shop/MechanicModulesPage.tsx` | `MechanicModulesPage.tsx` | Staff module launcher portal component |
| Frontend | `frontend/src/presentation/pages/shop/ShopManagementPage.tsx` | `ShopManagementPage.tsx` | Shop employee & permission management component |
| Frontend | `frontend/src/presentation/pages/shop/ShopMarketplacePage.tsx` | `ShopMarketplacePage.tsx` | Module marketplace & subscription catalog |
| Frontend | `frontend/src/presentation/pages/shop/ShopModuleWrapper.tsx` | `ShopModuleWrapper.tsx` | Embedded ERP module frame wrapper |
| Frontend | `frontend/src/presentation/pages/shop/ShopSettingsPage.tsx` | `ShopSettingsPage.tsx` | Shop details & security settings component |
| Frontend | `frontend/src/presentation/pages/shop/ShopSubscriptionPage.tsx` | `ShopSubscriptionPage.tsx` | Active subscriptions summary component |
| Frontend | `frontend/src/router.tsx` | `router.tsx` | React Router URL-to-view mappings |
| Frontend | `frontend/src/vite-env.d.ts` | `vite-env.d.ts` | TypeScript environment declarations |
| Frontend | `frontend/tsconfig.json` | `tsconfig.json` | TypeScript compiler configuration options |
| Frontend | `frontend/tsconfig.node.json` | `tsconfig.node.json` | TypeScript compiler configuration options |
| Frontend | `frontend/vite.config.ts` | `vite.config.ts` | Vite build tooling and proxy configuration |
| Testing | `tests/POSTMAN_API_GUIDE.md` | `POSTMAN_API_GUIDE.md` | Postman API collection guide |
| Testing | `tests/backend/test_api.py` | `test_api.py` | Pytest integration test for job cards & global DB |
| Testing | `tests/backend/test_jobcards.py` | `test_jobcards.py` | Pytest script for job card validation |
| Testing | `tests/backend/test_limit.py` | `test_limit.py` | Pytest script for query limits |
| Testing | `tests/backend/test_patch.py` | `test_patch.py` | Pytest script for schema patch verification |
| Testing | `tests/backend/test_patch2.py` | `test_patch2.py` | Pytest script for schema patch verification |
| Testing | `tests/frontend/test_frontend.py` | `test_frontend.py` | Playwright E2E frontend login & navigation test |

