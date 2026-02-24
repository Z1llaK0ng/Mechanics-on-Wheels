# MySQL Database Setup Instructions

## Quick Fix - The server failed to start because:

**Error**: `No connection could be made because the target machine actively refused it`

**Cause**: MySQL server is not running OR the database doesn't exist.

## Solution Options:

### Option 1: Install and Start MySQL (Recommended for Production)

1. **Install MySQL**:
   - Download from: https://dev.mysql.com/downloads/installer/
   - Or use XAMPP which includes MySQL

2. **Start MySQL Server**:
   ```bash
   # If using XAMPP
   Start XAMPP Control Panel → Start MySQL
   
   # If installed directly
   Start MySQL service from Windows Services
   ```

3. **Create Database**:
   ```bash
   # Open MySQL shell or phpMyAdmin
   CREATE DATABASE mechanicerp;
   ```

4. **Update Connection String** in `.env`:
   ```env
   DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/mechanicerp
   ```

### Option 2: Use SQLite for Development (Quick Test)

Change the database URL in `backend/app/config.py`:

```python
DATABASE_URL: str = "sqlite:///./mechanicerp.db"  # SQLite instead of MySQL
```

### Option 3: Skip Database for Now

The server will now start even if MySQL is not available! You'll see a warning but the app runs.

**Note**: API endpoints that require database will fail with 500 errors until you set up the database.

---

## Testing Without Database:

These endpoints will work:
- ✅ `GET /` - Root
- ✅ `GET /health` - Health check
- ✅ `GET /docs` - API documentation

These will fail until database is connected:
- ❌ `POST /api/v1/auth/register` - Needs database
- ❌ `POST /api/v1/auth/login` - Needs database
- ❌ `GET /api/v1/job-cards` - Needs database
