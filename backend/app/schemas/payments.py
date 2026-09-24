from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional, List


class PaymentRequest(BaseModel):
    payment_id : int 
    loan_id : int 
    customer_id : int 
    payment_number : int 
    due_date : datetime 
    emi_amount : float 
    interest_amount : float 
    principal_amount : float 
    paid_date : Optional[datetime] = None 
    payment_status : str 

    class Config:
        from_attributes = True

    
class PaymentStatusUpdate(BaseModel):
    payment_status : str
    paid_date : Optional[datetime] = None 
    
    