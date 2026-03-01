from pydantic import BaseModel
from typing import Optional


class VehicleBase(BaseModel):
    registry: str   # License plate
    vin: str
    company: str    # Manufacturer
    brand: str      # Model


class VehicleCreate(VehicleBase):
    owner_id: Optional[str] = None   # Appwrite $id of owner document


class VehicleUpdate(BaseModel):
    company: Optional[str] = None
    brand: Optional[str] = None
    owner_id: Optional[str] = None
    active_status: Optional[bool] = None


class VehicleResponse(VehicleBase):
    active_status: bool
    owner_id: Optional[str] = None

    # Also expose make/model aliases the frontend uses
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None

    model_config = {"from_attributes": True}


class VehicleIdentifyRequest(BaseModel):
    identifier: str   # VIN or license plate


class VehicleIdentifyResponse(VehicleResponse):
    pass
