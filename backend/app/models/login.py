from sqlalchemy import Column , Integer , String , ForeignKey , Boolean , Enum , DateTime
from sqlalchemy.orm import relationship
from database import Base 
import os 

from dotenv import load_dotenv 
from datetime import datetime 
from passlib.context import CryptContext 
from sqlalchemy.sql import func



load_dotenv() 

class Login(Base):
    __tablename__ = "logins" 
    pass
    
    
    
