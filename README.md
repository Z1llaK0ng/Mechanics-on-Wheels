# 🛠️ MechanicERP: Ghana Informal Sector Platform

**A Hybrid, Offline-First ERP for Automotive Workshops**

This project addresses the technological barriers in Ghana's informal mechanic sector by combining a **Hybrid Architecture** (Offline-First) with **Domain-Driven Design** (DDD). It allows mechanics to work seamlessly without internet while feeding a global database for macroeconomic visibility.

---

## 🏗️ The Tech Stack & Roles

We use a "Local-First" approach. The code is structured using **Clean Architecture** principles.

| Technology | Role | Clean Arch Layer | Context |
| :--- | :--- | :--- | :--- |
| **React** | **The Interface (UI)** | *Interface Adapters* | Renders the Dashboard, Job Cards, and Forms. |
| **Tauri** | **The Local Node (Device)** | *Infrastructure* | Wraps the UI into a native app. manages **Local SQLite DB** and the **Sync Engine**. |
| **PWA** | **The Resiliency Layer** | *Infrastructure* | Service Workers cache UI assets (HTML/CSS/JS) so the app loads instantly offline. |
| **FastAPI** | **The Central Node (Cloud)** | *Infrastructure* | The Global API Gateway. Validates sync data, handles auth, and aggregates GDP stats. |

---

## 📐 Architecture Breakdown

### 1. The Local Node (Frontend + Device)
**Stack:** React + Tauri (Rust) + SQLite
**Goal:** Enable "Everyday Operations" (Booking, Inventory) without internet.

* **React (The View):**
    * Contains the **UI Components** (Buttons, Forms).
    * Uses **React Query** or **Zustand** to manage "Page State."
    * *Clean Arch:* Acts as the "Presenter." It never talks to the API directly; it asks the *Application Layer* to "Save Data."
* **Tauri (The Heavy Lifter):**
    * **Local Database:** Uses a Rust plugin (e.g., `tauri-plugin-sql`) to write to a local **SQLite** file. This is more robust than browser `localStorage`.
    * **Sync Engine:** A Rust background thread that checks for internet connectivity.
        * *Online:* Pushes data to FastAPI.
        * *Offline:* Queues data locally.
* **PWA (The Safety Net):**
    * Ensures that even if the app isn't installed (e.g., accessed via Chrome on a phone), the *interface* still loads via Service Worker caching.

### 2. The Central Node (Backend)
**Stack:** Python (FastAPI) + PostgreSQL
**Goal:** Aggregation, Policy Making, and Backup.

* **FastAPI:**
    * Receives the JSON "Push" packets from Tauri.
    * **Validation:** Checks if the data conforms to the *Domain Rules* (e.g., "A Master Mechanic must have >5 years experience").
    * **Conflict Resolution:** Handles cases where data versions clash.
    * **Auth:** Issues JWT tokens for the mechanic to log in.

---

## 📂 Project Structure (Clean Architecture)

This structure ensures that we can swap the UI (React) or the DB (SQLite) without breaking the Business Logic (Domain).

```text
/
├── apps/
│   ├── desktop-client/          # (Tauri + React + PWA)
│   │   ├── src-tauri/           # Rust Code (Local DB, Sync Engine)
│   │   └── src/                 # React Code
│   │       ├── presentation/    # UI Components, Pages
│   │       ├── application/     # Use Cases (e.g., CreateJobCard)
│   │       ├── domain/          # Entities (JobCard, Apprentice)
│   │       └── infrastructure/  # API Clients, SQLite Repositories
│   │
│   └── cloud-backend/           # (FastAPI)
│       ├── app/
│       │   ├── api/             # Endpoints (Routes)
│       │   ├── core/            # Config, Security
│       │   ├── domain/          # Shared Domain Models (mirrors frontend)
│       │   └── services/        # Business Logic
