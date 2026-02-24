from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user
)
from app.config import settings
from app.domain.mechanic import Mechanic
from app.schemas.auth import Token
from app.schemas.mechanic import MechanicCreate, MechanicResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=MechanicResponse, status_code=status.HTTP_201_CREATED)
def register_mechanic(
    mechanic_data: MechanicCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new mechanic account.
    
    - **first_name**: Mechanic's first name
    - **last_name**: Mechanic's last name
    - **email**: Unique email address
    - **password**: Account password
    - **shop_id**: ID of the shop where the mechanic works
    """
    # Check if email already exists
    existing_mechanic = db.query(Mechanic).filter(Mechanic.email == mechanic_data.email).first()
    if existing_mechanic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new mechanic
    hashed_password = get_password_hash(mechanic_data.password)
    new_mechanic = Mechanic(
        first_name=mechanic_data.first_name,
        last_name=mechanic_data.last_name,
        email=mechanic_data.email,
        hashed_password=hashed_password,
        shop_id=mechanic_data.shop_id,
        active_status=True
    )
    
    db.add(new_mechanic)
    db.commit()
    db.refresh(new_mechanic)
    
    return new_mechanic


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login endpoint - returns JWT access token.
    
    - **username**: Mechanic's email address
    - **password**: Account password
    """
    # Find mechanic by email (username field in OAuth2 form)
    mechanic = db.query(Mechanic).filter(Mechanic.email == form_data.username).first()
    
    if not mechanic or not verify_password(form_data.password, mechanic.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not mechanic.active_status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": mechanic.email},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=MechanicResponse)
def get_current_mechanic(
    current_user: Mechanic = Depends(get_current_user)
):
    """
    Get current authenticated mechanic's profile.
    Requires valid JWT token in Authorization header.
    """
    return current_user
