# Use Case Scenarios – CarrySpanner

---

## 1. Authentication & Account Management

> Registration, login, and all mechanic account actions flow into each other.

```mermaid
flowchart TD
    ADMIN(["🏪 Shop Admin"])
    MECH(["🔧 Mechanic"])

    SA1["Register Shop\n(name · location · email · password)"]
    SA2["Log In as Admin\n(email + password)"]
    SA6["Update Shop Details / Password"]
    SA7["Add Mechanic\n(name · email · password)"]
    SA8["Enable / Disable Mechanic"]
    SA9["Remove Mechanic"]
    ME1["Log In as Mechanic\n(email + password + Shop ID)"]

    ADMIN --> SA1
    SA1 -->|"account created"| SA2
    SA2 --> SA6
    SA2 --> SA7
    SA7 -->|"account created"| SA8
    SA8 -->|"can also"| SA9
    SA7 -->|"credentials given to mechanic"| ME1
    MECH --> ME1
    ME1 -->|"blocked if disabled"| SA8
```

---

## 2. Module Marketplace & Access

> Subscribing to a module directly unlocks it for mechanics; the PWA gate depends on it.

```mermaid
flowchart TD
    ADMIN(["🏪 Shop Admin"])
    MECH(["🔧 Mechanic"])

    SA3["Browse Module Marketplace\n(see all available modules)"]
    SA4["Subscribe to Module\n(activates for whole shop)"]
    SA5["Unsubscribe from Module"]
    ME2["View Available Modules\n(only subscribed ones shown)"]
    ME8["Download PWA\n(install to device)"]

    ADMIN --> SA3
    SA3 --> SA4
    SA3 --> SA5
    SA4 -->|"unlocks module for"| ME2
    SA5 -->|"removes module from"| ME2
    MECH -->|"after login"| ME2
    ME2 --> ME8
    ME8 -->|"blocked if no active subscription"| SA4
```

---

## 3. Job Cards & Vehicle Management

> Identifying a vehicle feeds into creating a job card; missing vehicles trigger registration.

```mermaid
flowchart TD
    MECH(["🔧 Mechanic"])

    ME7["Identify Vehicle\n(search by VIN or plate)"]
    ME6["Register Vehicle\n(VIN · plate · make · model)"]
    ME3["Create Job Card\n(parts affected · details)"]
    ME4["View / Search Job Cards\n(filter by VIN · plate · status)"]
    ME5["Update Job Card Status\npending → in-progress → completed"]

    MECH --> ME7
    ME7 -->|"found"| ME3
    ME7 -->|"not found"| ME6
    ME6 -->|"now registered"| ME3
    ME3 -->|"job card created"| ME4
    ME4 --> ME5
    MECH --> ME4
```

---

## 🔐 Shared Access Rules

```mermaid
flowchart LR
    R1["JWT required\nfor all routes"]
    R2["Shop data isolated\nper shop"]
    R3["Disabled mechanic\n= login blocked"]
    R4["Duplicates blocked\nat API level"]

    R1 --- R2 --- R3 --- R4
```

---

## 🏪 Activity Diagram — Shop Admin

```mermaid
flowchart TD
    START(["●  Start"]):::start
    END1(["◉  End"]):::stop
    END2(["◉  End"]):::stop
    END3(["◉  End"]):::stop

    A1["Visit Landing Page"]
    A2{"Already\nregistered?"}
    A3["Fill Registration Form\nname · location · email · password"]
    A4{"Name or email\nalready exists?"}
    A5["Show error"]
    A6["Account Created"]
    A7["Log In\nemail + password"]
    A8{"Credentials\nvalid?"}
    A9["Show login error"]
    A10["JWT Issued — Redirect to Marketplace"]

    B1{"What does\nadmin do?"}

    B2["Browse Module Marketplace"]
    B3{"Subscribe\nor unsubscribe?"}
    B4["Activate Module for Shop"]
    B5["Deactivate Module for Shop"]

    C1["Open Shop Settings"]
    C2{"Settings action?"}
    C3["Update Shop Name / Location\nSave changes"]
    C4["Change Password\nverify current → set new"]
    C5["Add Mechanic\nname · email · password"]
    C6{"Email already\nused in shop?"}
    C7["Show duplicate error"]
    C8["Mechanic Account Created"]
    C9["Toggle Mechanic Active Status"]
    C10{"Disable\nor enable?"}
    C11["Mechanic blocked from login"]
    C12["Mechanic can log in again"]
    C13["Delete Mechanic\npermanently removed"]

    D1["Log Out"]

    START --> A1 --> A2
    A2 -->|"No"| A3 --> A4
    A4 -->|"Yes"| A5 --> A3
    A4 -->|"No"| A6 --> A7
    A2 -->|"Yes"| A7
    A7 --> A8
    A8 -->|"Invalid"| A9 --> A7
    A8 -->|"Valid"| A10 --> B1

    B1 -->|"Marketplace"| B2 --> B3
    B3 -->|"Subscribe"| B4 --> B1
    B3 -->|"Unsubscribe"| B5 --> B1

    B1 -->|"Settings"| C1 --> C2
    C2 -->|"Edit shop info"| C3 --> C2
    C2 -->|"Change password"| C4 --> C2
    C2 -->|"Add mechanic"| C5 --> C6
    C6 -->|"Yes"| C7 --> C5
    C6 -->|"No"| C8 --> C2
    C2 -->|"Toggle mechanic"| C9 --> C10
    C10 -->|"Disable"| C11 --> C2
    C10 -->|"Enable"| C12 --> C2
    C2 -->|"Delete mechanic"| C13 --> C2

    B1 -->|"Log out"| D1 --> END1
    A5 --> END2
    A9 --> END3

    classDef start fill:#2d2,color:#fff,stroke:none
    classDef stop  fill:#d22,color:#fff,stroke:none
```

---

## 🔧 Activity Diagram — Mechanic

```mermaid
flowchart TD
    START(["●  Start"]):::start
    END1(["◉  End"]):::stop
    END2(["◉  End"]):::stop
    END3(["◉  End"]):::stop

    A1["Visit Shop Login Page\n(Mechanic tab)"]
    A2["Enter Email + Password + Shop ID"]
    A3{"Shop ID\nvalid?"}
    A4["Show error — shop not found"]
    A5{"Credentials\ncorrect?"}
    A6["Show login error"]
    A7{"Account\nactive?"}
    A8["Show error — account deactivated"]
    A9["JWT Issued — Redirect to Modules"]

    B1["View Subscribed Modules"]
    B2{"Choose\na module"}

    C1["Job Cards Module"]
    C2{"Action?"}
    C3["Search / Filter Job Cards\nby VIN · plate · status"]
    C4["View Job Card Details"]
    C5["Update Status\npending → in-progress → completed"]
    C6["Create New Job Card"]
    C7["Identify Vehicle\nenter VIN or plate"]
    C8{"Vehicle\nfound?"}
    C9["Register Vehicle\nVIN · plate · make · model"]
    C10{"VIN or plate\nalready exists?"}
    C11["Show duplicate error"]
    C12["Vehicle Registered"]
    C13["Fill Job Card Details\nparts affected · description"]
    C14["Job Card Saved (status: pending)"]

    D1["Vehicles Module"]
    D2{"Action?"}
    D3["Search Vehicle by VIN / Plate"]
    D4["Register New Vehicle"]
    D5{"Duplicate\nVIN or plate?"}
    D6["Show duplicate error"]
    D7["Vehicle Registered"]

    E1["PWA Download Page"]
    E2{"Active subscription\nexists?"}
    E3["Show locked message"]
    E4["Trigger Browser Install Prompt"]
    E5["PWA Installed on Device"]

    F1["Log Out"]

    START --> A1 --> A2 --> A3
    A3 -->|"No"| A4 --> END2
    A3 -->|"Yes"| A5
    A5 -->|"Wrong"| A6 --> A2
    A5 -->|"Correct"| A7
    A7 -->|"Disabled"| A8 --> END3
    A7 -->|"Active"| A9 --> B1 --> B2

    B2 -->|"Job Cards"| C1 --> C2
    C2 -->|"View list"| C3 --> C4 --> C5 --> C2
    C2 -->|"New job card"| C6 --> C7 --> C8
    C8 -->|"Found"| C13
    C8 -->|"Not found"| C9 --> C10
    C10 -->|"Yes"| C11 --> C9
    C10 -->|"No"| C12 --> C13
    C13 --> C14 --> C2
    C2 -->|"Back"| B2

    B2 -->|"Vehicles"| D1 --> D2
    D2 -->|"Search"| D3 --> D2
    D2 -->|"Register"| D4 --> D5
    D5 -->|"Yes"| D6 --> D4
    D5 -->|"No"| D7 --> D2
    D2 -->|"Back"| B2

    B2 -->|"PWA Download"| E1 --> E2
    E2 -->|"No subscription"| E3 --> B2
    E2 -->|"Subscription active"| E4 --> E5 --> B2

    B2 -->|"Log out"| F1 --> END1

    classDef start fill:#2d2,color:#fff,stroke:none
    classDef stop  fill:#d22,color:#fff,stroke:none
```
