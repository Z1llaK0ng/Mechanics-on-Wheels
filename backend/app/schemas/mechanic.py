from pydantic import BaseModel, EmailStr
from typing import Optional


class MechanicBase(BaseModel):
    """Base schema for Mechanic."""
    first_name: str
    last_name: str
    email: EmailStr
    shop_id: int


class MechanicCreate(MechanicBase):
    """Schema for creating a mechanic."""
    password: str


class MechanicUpdate(BaseModel):
    """Schema for updating a mechanic."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    active_status: Optional[bool] = None


class MechanicResponse(MechanicBase):
    """Schema for mechanic response."""
    id: int
    active_status: bool
    
    class Config:
        from_attributes = True  # Pydantic v2 (was orm_mode in v1)


class MechanicLogin(BaseModel):
    """Schema for mechanic login."""
    email: EmailStr
    password: str
