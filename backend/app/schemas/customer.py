from pydantic import BaseModel
from typing import Optional

class Customerdetials(BaseModel):
    name: str
    email: str 
    phone: str 
    address: str 
    aadhar_number: str 
    pan_number: str 
    income_details: str 

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    aadhar_number: Optional[str] = None
    pan_number: Optional[str] = None
    income_details: Optional[str] = None

    

    