from sqlalchemy import Column , Integer , String , DateTime , Boolean , Float 
from database import Base 
from sqlalchemy.orm import relationship
from app.utils.timezone import get_ist_time 

class Customer(Base):
    __tablename__ = "customers" 

    id = Column(Integer, primary_key=True, index=True) 
    name = Column(String) 
    email = Column(String, unique=True) 
    phone = Column(String) 
    address = Column(String) 
    aadhar_number = Column(String) 
    pan_number = Column(String) 
    income_details = Column(String) 
    created_at = Column(DateTime, default=get_ist_time) 
    updated_at = Column(DateTime, default=get_ist_time, onupdate=get_ist_time)

    loans = relationship(
        "Loan",
        back_populates="customer",
        cascade="all"
    )

    payments = relationship(
        "Payment",
        back_populates="customer",
        cascade="all"
    )