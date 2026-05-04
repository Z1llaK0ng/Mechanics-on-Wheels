# 🔧 CarrySpanner — Workshop ERP for Ghana's Informal Mechanic Sector

**A cloud-backed, PWA-enabled ERP platform for automotive workshops.**

CarrySpanner (formerly Mechanics-on-Wheels) is a full-stack web application that helps informal auto-repair shops in Ghana manage job cards, track customer vehicles, administer staff, and share service records across a network of partner workshops through a Global Database.

---

## 🔗 Repository

**GitHub:** [https://github.com/Z1llaK0ng/Mechanics-on-Wheels](https://github.com/Z1llaK0ng/Mechanics-on-Wheels)

---

## 🏗️ System Architecture

CarrySpanner is split into three layers:

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18 + TypeScript + Vite | SPA served as a PWA; handles the ERP portal and the Shop Admin portal |
| **Backend** | Python 3.11 + FastAPI | REST API with JWT auth; all business logic |
| **Database** | Appwrite Cloud | NoSQL document store (collections = tables); no self-hosted DB required |

### Key modules available to shops (via subscription)
- **Job Cards** — Create, track, and update vehicle service records
- **CRM** — Customer profiles, vehicle–owner links, job-card notifications
- **Global Database** — Share job cards network-wide for cross-shop vehicle history
- **Employees** — Manage mechanics and staff roles
- **Invoicing / Inventory / Search / Shop Map** *(UI stubs, backend-ready)*

---

## 📂 Project Structure

```
Mechanics-on-Wheels/
├── backend/                   # FastAPI application
│   ├── app/
│   │   ├── api/v1/            # API route handlers (auth, shops, job_cards, crm, …)
│   │   ├── core/              # Appwrite client singleton, JWT security helpers
│   │   ├── schemas/           # Pydantic request/response models
│   │   └── main.py            # FastAPI app entry point
│   ├── .env.example           # Backend environment variable template
│   └── requirements.txt       # Python dependencies
│
├── frontend/                  # React + Vite SPA
│   ├── src/
│   │   ├── domain/            # Shared TypeScript types
│   │   ├── infrastructure/    # Axios API clients, Zustand auth stores
│   │   └── presentation/      # Pages, components, hooks
│   ├── .env.example           # Frontend environment variable template
│   └── package.json
│
├── database_schema/           # Appwrite schema management scripts
│   ├── setup_appwrite_db.py   # Creates all collections from scratch
│   ├── migrations.py          # Incremental schema changes and data seeding
│   └── .env                   # Credentials for the schema scripts
│
└── tests/                     # Cypress (frontend) and pytest (backend) test suites
```

---

## ⚙️ Prerequisites

| Tool | Minimum Version | Notes |
| :--- | :--- | :--- |
| Python | 3.11+ | Backend runtime |
| Node.js | 18+ | Frontend build tooling |
| npm | 9+ | Bundled with Node.js |
| Appwrite project | Any tier | Free tier is sufficient; create at [appwrite.io](https://appwrite.io) |

---

## 🚀 Installation & Local Development

### 1 — Clone the repository

```bash
git clone https://github.com/Z1llaK0ng/Mechanics-on-Wheels.git
cd Mechanics-on-Wheels
```

---

### 2 — Appwrite Cloud setup

CarrySpanner uses [Appwrite Cloud](https://appwrite.io) as its database. You need a free account and project before starting.

1. Create an account at [https://appwrite.io](https://appwrite.io).
2. Create a new **project** (note the **Project ID**).
3. Under **Settings → API Keys**, create a key with full database permissions (note the **API Key**).
4. Note your **Database ID** (you will create this in step 4 below).

---

### 3 — Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create the backend environment file:

```bash
# Copy the template
cp .env.example .env
```

Edit `backend/.env` and fill in your Appwrite credentials:

```env
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=<your-project-id>
APPWRITE_API_KEY=<your-api-key>
APPWRITE_DB_ID=<your-database-id>

SECRET_KEY=<a-long-random-string-for-jwt-signing>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

APP_NAME=CarrySpanner API
DEBUG=True
```

> **Note:** `SECRET_KEY` should be a long random string. Generate one with:
> `python -c "import secrets; print(secrets.token_hex(32))"`

---

### 4 — Database schema setup

The `database_schema/` scripts create and seed the Appwrite collections. They require their own `.env` file (same credentials as the backend).

```bash
cd database_schema
```

Create `database_schema/.env`:

```env
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=<your-project-id>
APPWRITE_API_KEY=<your-api-key>
APPWRITE_DB_ID=<your-database-id>
```

Run the setup script to create all collections:

```bash
python setup_appwrite_db.py
```

Then run all migrations to add attributes and seed subscription data:

```bash
python migrations.py
```

You can also run individual migrations by name:

```bash
python migrations.py seed_subscriptions
python migrations.py create_global_db
```

---

### 5 — Frontend setup

```bash
cd frontend

# Install dependencies
npm install
```

Create the frontend environment file:

```bash
cp .env.example .env
```

Edit `frontend/.env`:

```env
# URL of your running FastAPI backend
VITE_API_URL=http://localhost:8000/api/v1
```

---

### 6 — Run the application

Open **two terminals** side by side.

**Terminal 1 — Backend:**

```bash
cd backend
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS/Linux

uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

The web app will be available at `http://localhost:5173`.

---

## 🧪 Running the Tests

### Backend (pytest)

```bash
cd backend
venv\Scripts\activate
pip install pytest httpx
pytest ../tests/backend/
```

### Frontend (Cypress E2E)

```bash
# From the project root — Cypress is installed at the root level
npm install
npx cypress open
```

Select **E2E Testing** and run the specs in `tests/frontend/`.

---

## 🌐 Deployment

### Backend — any Python host (e.g. Render, Railway, Fly.io)

1. Set all environment variables from `backend/.env.example` in your hosting dashboard.
2. Set the start command to:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
3. The database is Appwrite Cloud — no database instance needed on the host.

### Frontend — static host (e.g. Vercel, Netlify, GitHub Pages)

```bash
cd frontend
npm run build        # outputs to frontend/dist/
```

Deploy the `frontend/dist/` directory to any static host.  
Set the environment variable `VITE_API_URL` to the deployed backend URL before building.

> **CORS:** The backend `main.py` lists allowed origins. Add your deployed frontend domain to the `allow_origins` list before going live.

---

## 🔑 Default User Roles

| Role | How to create | Access |
| :--- | :--- | :--- |
| **Shop Admin** | `POST /api/v1/auth/shop-register` | Full shop portal (marketplace, settings, staff management) |
| **Mechanic / Staff** | Created by the Shop Admin in the Management page | Job cards, CRM, Global DB (permissions set by admin) |

---

## 📄 API Reference

With the backend running locally, full interactive API documentation is available at:

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
