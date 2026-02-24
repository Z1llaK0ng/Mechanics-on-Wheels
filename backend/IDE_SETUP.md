# IDE Configuration - Fixing Import Errors

## The Problem

You're seeing lint errors like:
```
Could not find import of `fastapi`, `sqlalchemy`, `pydantic`, etc.
```

**This is NOT a code error** - it's an IDE configuration issue. Your code works fine (the server runs!), but your IDE doesn't know where to find the installed packages.

## Solution: Configure Python Interpreter

### For VS Code:

1. **Open Command Palette**: `Ctrl + Shift + P`

2. **Select Python Interpreter**:
   - Type: `Python: Select Interpreter`
   - Choose: `Python 3.11.x ('venv': venv)`
   - Location: `.\venv\Scripts\python.exe`

3. **Reload VS Code**: `Ctrl + Shift + P` → `Developer: Reload Window`

4. **Verify**: The lint errors should disappear!

### For PyCharm:

1. **Open Settings**: `File` → `Settings` (or `Ctrl + Alt + S`)

2. **Python Interpreter**:
   - Navigate to: `Project: Mechanics-on-Wheels` → `Python Interpreter`
   - Click the gear icon ⚙️
   - Select `Add Interpreter` → `Existing`
   - Browse to: `c:\Users\USER\OneDrive - Ashesi University\Desktop\Ashesi stuff\E-Commerce\Mechanics-on-Wheels\venv\Scripts\python.exe`

3. **Apply and OK**

4. **Verify**: PyCharm will index the packages - lint errors will disappear

---

## Alternative: Ignore IDE Errors

If configuring the IDE is too complex, you can **safely ignore these lint errors**. They don't affect:
- ✅ Running the server
- ✅ API functionality
- ✅ Code execution

**The errors are purely cosmetic** - your IDE just can't see the virtual environment.

---

## Quick Test: Verify Everything Works

Even with IDE errors showing, your code works perfectly:

```bash
# 1. Test imports manually
python -c "import sys; sys.path.insert(0, 'backend'); from app.main import app; print('Success!')"

# 2. Server runs fine
cd backend
python -m uvicorn app.main:app --reload

# 3. API works
Visit: http://localhost:8000/docs
```

All these work despite the IDE warnings! ✅
