from datetime import datetime
from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class ActiveSub(Base):
    """Active subscription intermediary table linking shops to subscriptions."""
    __tablename__ = "active_subs"
    
    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shop.shop_id"), nullable=False)
    subscription_id = Column(Integer, ForeignKey("subscriptions.subscription_id"), nullable=False)
    date_of_activation = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    shop = relationship("Shop", back_populates="active_subs")
    subscription = relationship("Subscription", back_populates="active_subs")
    
    def __repr__(self):
        return f"<ActiveSub(shop_id={self.shop_id}, subscription_id={self.subscription_id})>"
