from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class JobCardBase(BaseModel):
    vehicle_vin: str
    vehicle_registry: str
    parts_affected: str
    details: str


class JobCardCreate(JobCardBase):
    pass


class JobCardUpdate(BaseModel):
    parts_affected: Optional[str] = None
    details: Optional[str] = None
    status: Optional[str] = None


class JobCardResponse(JobCardBase):
    """Appwrite uses string $id, not integer PKs."""
    job_card_id: str          # maps to Appwrite $id
    upload_mechanic: str
    status: str
    created_at: str           # Appwrite returns ISO strings
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}
