from pydantic import BaseModel, field_validator
from typing import Optional, List
from app.core.security import capitalize_name


class VehicleBase(BaseModel):
    registry: str   # License plate
    vin: str
    company: str    # Manufacturer
    brand: str      # Model

    @field_validator("company", "brand")
    @classmethod
    def capitalize_vehicle_fields(cls, v: str) -> str:
        return capitalize_name(v.strip())


class VehicleCreate(VehicleBase):
    owner_id: Optional[str] = None   # Appwrite $id of owner document


class VehicleUpdate(BaseModel):
    registry: Optional[str] = None
    company: Optional[str] = None
    brand: Optional[str] = None
    owner_id: Optional[str] = None
    active_status: Optional[bool] = None

    @field_validator("company", "brand")
    @classmethod
    def capitalize_vehicle_fields(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return capitalize_name(v.strip())
        return v


class VehicleResponse(VehicleBase):
    active_status: bool
    owner_id: Optional[str] = None
    past_registry_num: Optional[List[str]] = None

    # Also expose make/model aliases the frontend uses
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None

    model_config = {"from_attributes": True}


class VehicleIdentifyRequest(BaseModel):
    identifier: str   # VIN or license plate


class VehicleIdentifyResponse(VehicleResponse):
    pass
