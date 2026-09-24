from fastapi import FastAPI , Depends 
from sqlalchemy.orm import Session 
from database import engine , Base , get_db 
from fastapi.middleware.cors import CORSMiddleware 
from app.routes.login import router as login_router
from app.routes.customers import router as customer_router
from app.routes.loan import router as loan_router
from app.routes.payments import router as payments_router
from app.models.payments import Payment
from app.models.loan import Loan
from app.models.customers import Customer


Base.metadata.create_all(bind=engine) # Create database tables on startup

app = FastAPI(
     version="0.0.1",
     title="Loan Management System"
     )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)  

app.include_router(login_router)
app.include_router(customer_router)
app.include_router(loan_router)
app.include_router(payments_router)

@app.get("/")
def read_root():
    return {"message": "API is running successfully"}  