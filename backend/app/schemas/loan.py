from pydantic import ConfigDict
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class LoanRequest(BaseModel):
    customer_id: int 
    principal_amount: float 
    interest_rate: float 
    loan_term: int 
    loan_type: str 
    start_date: datetime 

class LoanUpdate(BaseModel):
    principal_amount: Optional[float] = None
    interest_rate: Optional[float] = None
    loan_term: Optional[int] = None
    loan_type: Optional[str] = None
    loan_status: Optional[str] = None
    start_date: Optional[datetime] = None

class LoanResponse(BaseModel):
    id: int
    customer_id: int
    customer_name: str
    customer_phone_no : str
    customer_email : str 
    principal_amount: float
    interest_rate: float
    loan_term: int
    loan_type: str
    loan_status: str
    start_date: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)