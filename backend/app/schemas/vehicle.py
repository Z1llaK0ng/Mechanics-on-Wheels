from pydantic import BaseModel
from typing import Optional


class VehicleBase(BaseModel):
    """Base schema for Vehicle."""
    registry: str  # License plate
    vin: str
    company: str  # Manufacturer
    brand: str    # Model


class VehicleCreate(VehicleBase):
    """Schema for creating/registering a vehicle."""
    owner_id: Optional[int] = None


class VehicleUpdate(BaseModel):
    """Schema for updating vehicle."""
    company: Optional[str] = None
    brand: Optional[str] = None
    owner_id: Optional[int] = None
    active_status: Optional[bool] = None


class VehicleResponse(VehicleBase):
    """Schema for vehicle response."""
    active_status: bool
    owner_id: Optional[int] = None
    
    class Config:
        from_attributes = True


class VehicleIdentifyRequest(BaseModel):
    """Schema for vehicle identification request."""
    identifier: str  # VIN or license plate


class VehicleIdentifyResponse(VehicleResponse):
    """Schema for vehicle identification response."""
    pass
