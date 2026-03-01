from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base


class Shop(Base):
    """Workshop/Garage entity with admin authentication."""
    __tablename__ = "shop"

    shop_id = Column(Integer, primary_key=True, index=True)
    shop_name = Column(String(200), unique=True, nullable=False, index=True)
    location = Column(String(300), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    # Relationships
    mechanics = relationship("Mechanic", back_populates="shop")
    active_subs = relationship("ActiveSub", back_populates="shop")

    def __repr__(self):
        return f"<Shop(id={self.shop_id}, name='{self.shop_name}')>"
