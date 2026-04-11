"""
JWT helpers for Shop Portal (admin + mechanic) based on the same tokens
issued in `shop_auth.py`.
"""
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.config import settings
from app.core.security import decode_access_token


shop_oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/shop-login")


async def get_current_shop_admin(token: str = Depends(shop_oauth2_scheme)) -> dict:
    """
    Validate a Shop Portal JWT and ensure it's an admin token.
    Returns the decoded payload, which includes `shop_id` and `role`.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate shop credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    role: Optional[str] = payload.get("role")
    shop_id: Optional[str] = payload.get("shop_id")
    if role != "admin" or not shop_id:
        raise credentials_exception

    return payload


async def get_current_shop_user(token: str = Depends(shop_oauth2_scheme)) -> dict:
    """
    Accept any valid Shop Portal JWT (admin OR mechanic/staff).
    Returns the decoded payload including `shop_id` and `role`.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate shop credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    shop_id: Optional[str] = payload.get("shop_id")
    if not shop_id:
        raise credentials_exception

    return payload

