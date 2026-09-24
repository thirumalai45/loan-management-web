from sqlalchemy import Column , Integer , String , DateTime , Boolean , Float,ForeignKey 
from database import Base 
from sqlalchemy.orm import relationship
from app.utils.timezone import get_ist_time 
from app.models.customers import Customer


class Payment(Base) :
    __tablename__ = "payments" 

    payment_id = Column(Integer , primary_key=True , index=True) 
    loan_id = Column(Integer,ForeignKey("loans.loan_id"))
    customer_id = Column(Integer,ForeignKey("customers.id"))
    payment_number = Column(Integer , index=True)
    due_date = Column(DateTime , default=get_ist_time) 
    emi_amount = Column(Float , index=True) 
    interest_amount = Column(Float , index=True)
    principal_amount = Column(Float , index=True)
    paid_date = Column(DateTime , nullable=True, default=None)
    payment_status = Column(String , index=True , default="pending")
    

    loan = relationship("Loan", back_populates="payments")
    customer = relationship("Customer", back_populates="payments")