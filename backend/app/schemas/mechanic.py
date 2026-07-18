from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from app.core.security import capitalize_name


class MechanicBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    shop_id: str    # Appwrite string $id

    @field_validator("first_name", "last_name")
    @classmethod
    def capitalize_names(cls, v: str) -> str:
        return capitalize_name(v.strip())


class MechanicCreate(MechanicBase):
    password: str


class MechanicUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    active_status: Optional[bool] = None

    @field_validator("first_name", "last_name")
    @classmethod
    def capitalize_names(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return capitalize_name(v.strip())
        return v


class MechanicResponse(MechanicBase):
    id: str           # Appwrite $id
    active_status: bool
    full_name: Optional[str] = None
    shop_name: Optional[str] = None
    staffrole: Optional[str] = "technician"
    permitted_modules: List[str] = []
    can_push_global_db: bool = False

    model_config = {"from_attributes": True}


class MechanicLogin(BaseModel):
    email: EmailStr
    password: str
