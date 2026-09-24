from sqlalchemy import Column , Integer , String , DateTime , Boolean , Float,ForeignKey 
from database import Base 
from sqlalchemy.orm import relationship
from app.utils.timezone import get_ist_time 


class Loan(Base) : 
    __tablename__ = "loans" 
    
    loan_id = Column(Integer , primary_key=True , index=True) 
    customer_id = Column(Integer,ForeignKey("customers.id") , index=True ,nullable=False)
    principal_amount = Column(Float , index=True) 
    interest_rate = Column(Float , index=True) 
    loan_term = Column(Integer , index=True) 
    loan_type = Column(String , index=True) 
    loan_status = Column(String , index=True ,default="active") 
    start_date = Column(DateTime , index=True) 
    close_date = Column(DateTime , index=True , nullable=True)
    created_at = Column(DateTime, default=get_ist_time) 
    updated_at = Column(DateTime, default=get_ist_time, onupdate=get_ist_time)

    customer = relationship(
        "Customer",
        back_populates="loans",
        cascade="all"
    )

    payments = relationship(
        "Payment",
        back_populates="loan",
        cascade="all,delete-orphan"
    ) 
