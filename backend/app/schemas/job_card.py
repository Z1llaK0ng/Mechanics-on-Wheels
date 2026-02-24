from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class JobCardBase(BaseModel):
    """Base schema for Job Card."""
    vehicle_vin: str
    vehicle_registry: str
    parts_affected: str
    details: str


class JobCardCreate(JobCardBase):
    """Schema for creating a job card."""
    pass


class JobCardUpdate(BaseModel):
    """Schema for updating a job card."""
    parts_affected: Optional[str] = None
    details: Optional[str] = None
    status: Optional[str] = None


class JobCardResponse(JobCardBase):
    """Schema for job card response."""
    job_card_id: int
    upload_mechanic: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
