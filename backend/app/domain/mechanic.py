from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Mechanic(Base):
    """Mechanic/User entity with authentication."""
    __tablename__ = "mechanics"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    
    shop_id = Column(Integer, ForeignKey("shop.shop_id"), nullable=False)
    active_status = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    shop = relationship("Shop", back_populates="mechanics")
    job_cards = relationship("JobCard", back_populates="mechanic")
    
    @property
    def full_name(self) -> str:
        """Get mechanic's full name."""
        return f"{self.first_name} {self.last_name}"
    
    def __repr__(self):
        return f"<Mechanic(id={self.id}, name='{self.full_name}', email='{self.email}')>"
