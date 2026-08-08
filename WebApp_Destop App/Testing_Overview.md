# CarrySpanner: Testing Overview

Based on the project's file structure, existing documentation, and conversation history, several different layers of testing were conducted during the build process. Here is a summary of the testing approaches and specific tests that were carried out:

## 1. Backend & Database Integration Tests
Structured integration tests and Pytest scripts located in `tests/backend/` test our integrations with the Appwrite Database and the FastAPI backend endpoints directly:

* **`tests/backend/test_api.py`**: An end-to-end integration test script for the `Job Card` and `Global DB` module endpoints. This script programmatically simulates a user logging in, grabbing a JWT token, creating a new job card, tagging it to be uploaded to the `global-db`, retrieving the global records to verify it successfully transitioned, untagging it, and finally safely wiping the test data.
* **Database Operations & Schema patching (`tests/backend/test_patch.py`, `tests/backend/test_patch2.py`, `tests/backend/test_jobcards.py`)**: Scripts used to automate schema validation and verify whether we could successfully read, write, update, and patch schema attributes programmatically through the Appwrite Python SDK.

## 2. Frontend Automated & E2E Testing (Playwright)
* **`tests/frontend/test_frontend.py`**: An automated end-to-end integration test using **Playwright for Python**. It launches headless Chromium, navigates the `/shop/login` flow, tests Shop Staff authentication with test shop IDs, verifies network responses (handling 401s), and tests navigation into subscribed ERP modules like CRM.

## 3. Manual Testing & Role Authorization
Since CarrySpanner uses specialized Role-Based Access Control (RBAC) (Admins, Mechanics, Staff), manual testing was heavily used during the frontend GUI build. 

A dedicated `Test_logins.md` file was created and maintained. It holds standardized credentials targeting specific user capabilities so developers could easily boot up the UI and test permissions:
* **Shop Owner/Admin Testing:** `admin@chem1c.com`
* **Mechanic Testing:** `N.Quayenortey@chem1c.com`
* **Shop Staff Testing:** `T.Quayenortey@chem1c.com`

## 4. API Tooling (Postman Guides)
During backend API development, we explicitly generated the **Postman API Testing Guide** (`tests/POSTMAN_API_GUIDE.md`) to standardly test the JSON payloads, verify routing/login structures, and debug server errors (e.g., debugging Shop Login errors and fixing network creation errors for Shop Admins). Pytest test scripts (`pytest tests/backend/`) are also configured for automated API verification.

## Summary
In short, the project relies on **backend integration test scripts** (`tests/backend/`) verifying connection loops between FastAPI and Appwrite, **Playwright E2E browser automation** (`tests/frontend/`), and **manual E2E verification** on the React/Vite frontend using predefined user personas.
