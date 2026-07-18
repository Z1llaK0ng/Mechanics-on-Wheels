from pydantic import BaseModel, EmailStr, field_validator
from typing import List
from app.core.security import capitalize_name


# ── Shop Registration ─────────────────────────────────────────────────────────

class ShopCreate(BaseModel):
    shop_name: str
    location: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("shop_name")
    @classmethod
    def shop_name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Shop name cannot be empty")
        return capitalize_name(v.strip())

    @field_validator("location")
    @classmethod
    def location_capitalize(cls, v: str) -> str:
        return capitalize_name(v.strip())


# ── Shop Login ────────────────────────────────────────────────────────────────

class ShopLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "ShopUserPayload"

    model_config = {"from_attributes": True}


class ShopUserPayload(BaseModel):
    id: str
    name: str
    email: str
    role: str
    shopId: str
    shopName: str
    subscribedModules: List[str] = []


ShopLoginResponse.model_rebuild()


# ── Shop Response ─────────────────────────────────────────────────────────────

class ShopResponse(BaseModel):
    """Public shop details returned after registration (no password)."""
    shop_id: str        # Appwrite $id string
    shop_name: str
    location: str
    email: str

    model_config = {"from_attributes": True}


# ── Mechanic Login ────────────────────────────────────────────────────────────

class MechanicLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "MechanicUserPayload"

    model_config = {"from_attributes": True}


class MechanicUserPayload(BaseModel):
    id: str
    name: str
    email: str
    role: str
    shopId: str
    shopName: str
    subscribedModules: List[str] = []
    permittedModules: List[str] = []
    staffrole: str = "technician"  # 'technician' | 'staff'


MechanicLoginResponse.model_rebuild()
