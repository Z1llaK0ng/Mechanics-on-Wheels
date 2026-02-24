from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base


class VehicleOwner(Base):
    """Vehicle owner/customer entity (CRM)."""
    __tablename__ = "vehicle_owners"
    
    vo_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    
    # Additional CRM fields
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    
    # Relationships
    vehicles = relationship("Vehicle", back_populates="owner")
    
    def __repr__(self):
        return f"<VehicleOwner(id={self.vo_id}, name='{self.name}')>"
