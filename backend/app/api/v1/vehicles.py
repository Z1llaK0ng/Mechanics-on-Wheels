import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.domain.mechanic import Mechanic
from app.domain.vehicle import Vehicle
from app.schemas.vehicle import (
    VehicleCreate,
    VehicleUpdate,
    VehicleResponse,
    VehicleIdentifyRequest,
    VehicleIdentifyResponse
)



router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.post("/identify", response_model=VehicleIdentifyResponse)
def identify_vehicle(
    request: VehicleIdentifyRequest,
    db: Session = Depends(get_db),
    current_user: Mechanic = Depends(get_current_user)
):
    """
    Identify a vehicle by VIN or license plate (registry).
    
    Supports:
    - VIN (17 characters)
    - License plate format: XX ####-YY or XX ####-Y
    """
    identifier = request.identifier.strip().upper()
    
    # Check if it's a license plate (Ghana format)
    registry_pattern = r'^[A-Z]{2}\s?\d{4}-(\d{2}|[A-Z])$'
    
    # Try to find by VIN first
    vehicle = db.query(Vehicle).filter(Vehicle.vin == identifier).first()
    
    # Try registry if VIN not found
    if not vehicle and re.match(registry_pattern, identifier):
        vehicle = db.query(Vehicle).filter(Vehicle.registry == identifier).first()
    
    # Try partial match on registry (in case of formatting differences)
    if not vehicle:
        vehicle = db.query(Vehicle).filter(Vehicle.registry.contains(identifier.replace(" ", ""))).first()
    
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found with the provided identifier"
        )
    
    return vehicle


@router.get("", response_model=List[VehicleResponse])
def list_vehicles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    company: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: Mechanic = Depends(get_current_user)
):
    """List all vehicles with optional filters."""
    query = db.query(Vehicle)
    
    if company:
        query = query.filter(Vehicle.company.ilike(f"%{company}%"))
    
    if active_only:
        query = query.filter(Vehicle.active_status == True)
    
    vehicles = query.offset(skip).limit(limit).all()
    return vehicles


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def register_vehicle(
    vehicle_data: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: Mechanic = Depends(get_current_user)
):
    """Register a new vehicle in the system."""
    # Check if vehicle already exists
    existing = db.query(Vehicle).filter(
        (Vehicle.vin == vehicle_data.vin) | (Vehicle.registry == vehicle_data.registry)
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle with this VIN or registry already exists"
        )
    
    new_vehicle = Vehicle(
        registry=vehicle_data.registry,
        vin=vehicle_data.vin,
        company=vehicle_data.company,
        brand=vehicle_data.brand,
        owner_id=vehicle_data.owner_id
    )
    
    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)
    
    return new_vehicle


@router.get("/{registry}", response_model=VehicleResponse)
def get_vehicle(
    registry: str,
    db: Session = Depends(get_db),
    current_user: Mechanic = Depends(get_current_user)
):
    """Get vehicle by license plate (registry)."""
    vehicle = db.query(Vehicle).filter(Vehicle.registry == registry).first()
    
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found"
        )
    
    return vehicle


@router.put("/{registry}", response_model=VehicleResponse)
def update_vehicle(
    registry: str,
    vehicle_update: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: Mechanic = Depends(get_current_user)
):
    """Update vehicle information."""
    vehicle = db.query(Vehicle).filter(Vehicle.registry == registry).first()
    
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found"
        )
    
    update_data = vehicle_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vehicle, field, value)
    
    db.commit()
    db.refresh(vehicle)
    
    return vehicle


@router.delete("/{registry}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_vehicle(
    registry: str,
    db: Session = Depends(get_db),
    current_user: Mechanic = Depends(get_current_user)
):
    """Deactivate a vehicle (soft delete)."""
    vehicle = db.query(Vehicle).filter(Vehicle.registry == registry).first()
    
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found"
        )
    
    vehicle.active_status = False
    db.commit()
    
    return None
