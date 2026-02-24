from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.domain.mechanic import Mechanic
from app.domain.job_card import JobCard
from app.schemas.job_card import JobCardCreate, JobCardUpdate, JobCardResponse

router = APIRouter(prefix="/job-cards", tags=["Job Cards"])


@router.post("", response_model=JobCardResponse, status_code=status.HTTP_201_CREATED)
def create_job_card(
    job_card_data: JobCardCreate,
    db: Session = Depends(get_db),
    current_user: Mechanic = Depends(get_current_user)
):
    """
    Create a new job card.
    Requires authentication.
    """
    # Create job card with current mechanic as uploader
    new_job_card = JobCard(
        vehicle_vin=job_card_data.vehicle_vin,
        vehicle_registry=job_card_data.vehicle_registry,
        upload_mechanic=current_user.id,
        parts_affected=job_card_data.parts_affected,
        details=job_card_data.details,
        status="pending"
    )
    
    db.add(new_job_card)
    db.commit()
    db.refresh(new_job_card)
    
    return new_job_card


@router.get("", response_model=List[JobCardResponse])
def list_job_cards(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    vin: Optional[str] = None,
    registry: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Mechanic = Depends(get_current_user)
):
    """
    List job cards with optional filters.
    
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return
    - **vin**: Filter by vehicle VIN
    - **registry**: Filter by license plate
    - **status**: Filter by job status
    """
    query = db.query(JobCard)
    
    if vin:
        query = query.filter(JobCard.vehicle_vin == vin)
    if registry:
        query = query.filter(JobCard.vehicle_registry == registry)
    if status:
        query = query.filter(JobCard.status == status)
    
    job_cards = query.offset(skip).limit(limit).all()
    return job_cards


@router.get("/{job_card_id}", response_model=JobCardResponse)
def get_job_card(
    job_card_id: int,
    db: Session = Depends(get_db),
    current_user: Mechanic = Depends(get_current_user)
):
    """Get job card by ID."""
    job_card = db.query(JobCard).filter(JobCard.job_card_id == job_card_id).first()
    
    if not job_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job card not found"
        )
    
    return job_card


@router.put("/{job_card_id}", response_model=JobCardResponse)
def update_job_card(
    job_card_id: int,
    job_card_update: JobCardUpdate,
    db: Session = Depends(get_db),
    current_user: Mechanic = Depends(get_current_user)
):
    """Update an existing job card."""
    job_card = db.query(JobCard).filter(JobCard.job_card_id == job_card_id).first()
    
    if not job_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job card not found"
        )
    
    # Update fields if provided
    update_data = job_card_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(job_card, field, value)
    
    db.commit()
    db.refresh(job_card)
    
    return job_card


@router.delete("/{job_card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_card(
    job_card_id: int,
    db: Session = Depends(get_db),
    current_user: Mechanic = Depends(get_current_user)
):
    """Delete a job card."""
    job_card = db.query(JobCard).filter(JobCard.job_card_id == job_card_id).first()
    
    if not job_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job card not found"
        )
    
    db.delete(job_card)
    db.commit()
    
    return None


@router.put("/{job_card_id}/status", response_model=JobCardResponse)
def update_job_card_status(
    job_card_id: int,
    new_status: str = Query(..., alias="status", pattern="^(pending|in-progress|completed)$"),
    db: Session = Depends(get_db),
    current_user: Mechanic = Depends(get_current_user)
):
    """Update job card status only."""
    job_card = db.query(JobCard).filter(JobCard.job_card_id == job_card_id).first()
    
    if not job_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job card not found"
        )
    
    job_card.status = new_status
    db.commit()
    db.refresh(job_card)
    
    return job_card
