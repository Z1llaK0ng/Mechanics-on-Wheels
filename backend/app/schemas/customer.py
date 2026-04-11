from pydantic import BaseModel
from typing import Optional, List
from app.schemas.vehicle import VehicleResponse


class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class CustomerResponse(BaseModel):
    id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    shop_id: Optional[str] = None
    vehicle_count: int = 0

    model_config = {"from_attributes": True}


class CustomerDetailResponse(CustomerResponse):
    vehicles: List[VehicleResponse] = []


class VehicleOwnerAssign(BaseModel):
    """Payload for assigning an existing owner to a vehicle."""
    owner_id: Optional[str] = None   # None = unassign


class NotifyRequest(BaseModel):
    job_card_id: str
    message: Optional[str] = None   # Optional override message


class NotifyResponse(BaseModel):
    customer_name: str
    customer_email: Optional[str]
    customer_phone: Optional[str]
    job_card_id: str
    vehicle_registry: str
    status: str
    message: str
