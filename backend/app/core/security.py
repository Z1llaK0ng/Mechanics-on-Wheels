"""
JWT security utilities for the CarrySpanner API.
Password hashing, token creation/decoding, and the get_current_user dependency.
Uses Appwrite instead of SQLAlchemy for user lookup.
"""
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from appwrite.query import Query

from app.config import settings
from app.core.appwrite_client import databases, DB_ID, COL_MECHANICS

import bcrypt

_BCRYPT_B64 = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password:
        return False
    pw_bytes = plain_password.encode('utf-8')[:72]
    hash_bytes = hashed_password.encode('utf-8')
    try:
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except ValueError as e:
        # Passlib-generated hashes may have non-zero trailing bits in 22nd salt char.
        # Normalize the 22nd salt char to avoid 'ValueError: Invalid salt' in pyca/bcrypt.
        if "Invalid salt" in str(e) and len(hashed_password) >= 60 and (hashed_password.startswith("$2a$") or hashed_password.startswith("$2b$") or hashed_password.startswith("$2y$")):
            try:
                c22 = hashed_password[28]
                if c22 in _BCRYPT_B64:
                    fixed_c22 = _BCRYPT_B64[_BCRYPT_B64.index(c22) & 0x30]
                    fixed_hash = hashed_password[:28] + fixed_c22 + hashed_password[29:]
                    return bcrypt.checkpw(pw_bytes, fixed_hash.encode('utf-8'))
            except Exception:
                pass
        return False
    except Exception as e:
        print(f"[WARN] verify_password error: {e}")
        return False



def get_password_hash(password: str) -> str:
    pw_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode('utf-8')



def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Validate JWT and return the user document dict from Appwrite.
    Supports both Mechanics and Shop Admins for unified endpoints.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    email: Optional[str] = payload.get("sub")
    if email is None:
        raise credentials_exception

    role: Optional[str] = payload.get("role")

    try:
        if role == "admin":
            # For admin tokens, the JWT already carries all needed claims.
            # Skip the Appwrite lookup — it can fail silently and produce a 401.
            shop_id: Optional[str] = payload.get("shop_id")
            if not shop_id:
                raise credentials_exception
            return {
                "$id": shop_id,
                "email": email,
                "shop_id": shop_id,
                "shop_name": payload.get("shop_name", ""),
                "active_status": True,
                "role": "admin",
            }
        else:
            shop_id = payload.get("shop_id")
            if not shop_id:
                raise credentials_exception

            result = databases.list_documents(
                database_id=DB_ID,
                collection_id=COL_MECHANICS,
                queries=[
                    Query.equal("email", email),
                    Query.equal("shop_id", shop_id)
                ]
            )
            docs = result["documents"]
            if not docs:
                raise credentials_exception

            doc = docs[0]
            # Build a plain dict — Appwrite Document objects don't implement full dict interface
            user = {
                "$id": doc["$id"],
                "email": doc.get("email", ""),
                "first_name": doc.get("first_name", ""),
                "last_name": doc.get("last_name", ""),
                "shop_id": doc.get("shop_id", ""),
                "active_status": doc.get("active_status", False),
                "staffrole": doc.get("staffrole", "technician"),
                "permitted_modules": doc.get("permitted_modules", []),
                "can_push_global_db": doc.get("can_push_global_db", False),
                "role": "mechanic",
            }
            if not user["active_status"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Inactive user account"
                )
            return user
    except HTTPException:
        raise
    except Exception:
        raise credentials_exception


def capitalize_name(name: Optional[str]) -> Optional[str]:
    """Capitalize the first letter of each word in a string."""
    if not name:
        return name
    return " ".join(w[0].upper() + w[1:] if w else "" for w in name.split(" "))

