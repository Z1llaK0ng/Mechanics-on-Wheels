# CarrySpanner: Testing Overview

Based on the project's file structure, existing documentation, and conversation history, several different layers of testing were conducted during the build process. Here is a summary of the testing approaches and specific tests that were carried out:

## 1. Backend & Database Integration Tests
Several ad-hoc Python testing scripts were created to test our integrations with the Appwrite Database and the FastAPI backend endpoints directly:

* **`test_api.py`**: An end-to-end integration test script for the `Job Card` module endpoints. This script programmatically simulates a user logging in, grabbing a JWT token, creating a new job card, tagging it to be uploaded to the `global-db`, retrieving the global records to verify it successfully transitioned, untagging it, and finally safely wiping the test data.
* **Database Operations & Schema patching (`test_create_mechanic.py`, `test_patch_schema.py`, `test_attrs.py`)**: Several scripts were repeatedly run to automate schema validation and verify whether we could successfully read, write, update, and patch schema attributes programmatically through the Appwrite Python SDK.

## 2. Manual Testing & Role Authorization
Since CarrySpanner uses specialized Role-Based Access Control (RBAC) (Admins, Mechanics, Staff), manual testing was heavily used during the frontend GUI build. 

A dedicated `Test_logins.md` file was created and maintained. It holds standardized credentials targeting specific user capabilities so developers could easily boot up the UI and test permissions:
* **Shop Owner/Admin Testing:** `admin@chem1c.com`
* **Mechanic Testing:** `N.Quayenortey@chem1c.com`
* **Shop Staff Testing:** `T.Quayenortey@chem1c.com`

## 3. API Tooling (Postman Guides)
During backend API development, we explicitly generated **Postman API Testing Guides** to standardly test the JSON payloads, verify routing/login structures, and debug server errors (e.g., debugging Shop Login 500 errors and fixing network creation errors for Shop Admins). Some configuration code for `pytest` and FastAPI's `TestClient` was also generated at earlier stages to explore formal unit tests.

## Summary
In short, the project relies heavily on **ad-hoc integration scripts** verifying connection loops between the FastAPI layer and the Appwrite database constraints, combined with **manual E2E verification** on the React/Vite frontends using predefined user personas. 
