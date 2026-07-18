from pydantic import BaseModel, field_validator
from typing import Optional, List
from app.schemas.vehicle import VehicleResponse
from app.core.security import capitalize_name


class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_capitalize(cls, v: str) -> str:
        return capitalize_name(v.strip())


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    phone_verified: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def name_capitalize(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return capitalize_name(v.strip())
        return v


class CustomerResponse(BaseModel):
    id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    vehicle_count: int = 0
    phone_verified: bool = False

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


class SendSmsRequest(BaseModel):
    phone: str
    message: str


class SendSmsResponse(BaseModel):
    status: str
    phone: str
    message: str


class OtpSendRequest(BaseModel):
    phone: str


class OtpVerifyRequest(BaseModel):
    phone: str
    code: str


class OtpResponse(BaseModel):
    status: str
    message: str
