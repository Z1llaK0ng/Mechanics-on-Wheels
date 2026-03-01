from pydantic import BaseModel, EmailStr
from typing import Optional


class MechanicBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    shop_id: str    # Appwrite string $id


class MechanicCreate(MechanicBase):
    password: str


class MechanicUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    active_status: Optional[bool] = None


class MechanicResponse(MechanicBase):
    id: str           # Appwrite $id
    active_status: bool
    full_name: Optional[str] = None

    model_config = {"from_attributes": True}


class MechanicLogin(BaseModel):
    email: EmailStr
    password: str
