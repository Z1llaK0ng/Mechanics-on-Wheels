from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class JobCard(Base):
    """Job card/service record entity."""
    __tablename__ = "job_cards"
    
    job_card_id = Column(Integer, primary_key=True, index=True)
    
    # Vehicle references
    vehicle_vin = Column(String(17), ForeignKey("vehicles.vin"), nullable=False)
    vehicle_registry = Column(String(20), ForeignKey("vehicles.registry"), nullable=False)
    
    # Mechanic who uploaded this job card
    upload_mechanic = Column(Integer, ForeignKey("mechanics.id"), nullable=False)
    
    # Job details
    parts_affected = Column(Text, nullable=False)  # JSON or comma-separated list
    details = Column(Text, nullable=False)         # Job description, symptoms, diagnosis
    
    # Status and timestamps
    status = Column(String(50), default="pending", nullable=False)  # pending, in-progress, completed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    vehicle = relationship("Vehicle", back_populates="job_cards")
    mechanic = relationship("Mechanic", back_populates="job_cards")
    
    def __repr__(self):
        return f"<JobCard(id={self.job_card_id}, vehicle='{self.vehicle_registry}', status='{self.status}')>"
