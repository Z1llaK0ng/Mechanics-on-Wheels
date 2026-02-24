from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Vehicle(Base):
    """Vehicle entity."""
    __tablename__ = "vehicles"
    
    registry = Column(String(20), primary_key=True, unique=True, index=True)  # License plate
    vin = Column(String(17), unique=True, nullable=False, index=True)
    company = Column(String(100), nullable=False)  # Manufacturer (e.g., Benz, Toyota)
    brand = Column(String(100), nullable=False)    # Model (e.g., E350, Landcruiser)
    active_status = Column(Boolean, default=True, nullable=False)
    
    # Foreign key to vehicle owner
    owner_id = Column(Integer, ForeignKey("vehicle_owners.vo_id"), nullable=True)
    
    # Relationships
    owner = relationship("VehicleOwner", back_populates="vehicles")
    job_cards = relationship("JobCard", back_populates="vehicle")
    
    def __repr__(self):
        return f"<Vehicle(registry='{self.registry}', vin='{self.vin}', {self.company} {self.brand})>"
