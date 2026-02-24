from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base


class Subscription(Base):
    """Subscription plan entity."""
    __tablename__ = "subscriptions"
    
    subscription_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    payment_period = Column(String(50), nullable=False)  # e.g., "monthly", "yearly"
    
    # Relationships
    active_subs = relationship("ActiveSub", back_populates="subscription")
    
    def __repr__(self):
        return f"<Subscription(id={self.subscription_id}, name='{self.name}')>"

