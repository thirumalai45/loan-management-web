from sqlalchemy.orm import joinedload
from fastapi import APIRouter,Depends,HTTPException,status
from database import get_db
from sqlalchemy.orm import Session
from typing import List
from app.models.customers import Customer 
from app.models.loan import Loan 
from app.schemas.loan import LoanRequest , LoanResponse ,LoanUpdate 
from datetime import datetime
from app.utils.timezone import get_ist_time, to_ist
from app.models.payments import Payment

router = APIRouter(prefix="/loans",tags=["loans"])

@router.post("/apply")
def apply_for_loan(loan_request: LoanRequest, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == loan_request.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    if loan_request.loan_type not in [
        "weekly",
        "monthly",
        "yearly"
    ]:

        raise HTTPException(
            status_code=400,
            detail="loan_type must be weekly, monthly or yearly"
        )
    
    customer_loans = (db.query(Loan).filter(Loan.customer_id == loan_request.customer_id).count())
    if customer_loans >= 5:
        raise HTTPException(
            status_code=400,
            detail="Customer can have only 5 loans"
        )

    if loan_request.principal_amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Principal amount must be greater than 0"
        )

    if loan_request.interest_rate <= 0:
        raise HTTPException(
            status_code=400,
            detail="Interest rate must be greater than 0"
        )

    if loan_request.loan_term <= 0:
        raise HTTPException(
            status_code=400,
            detail="Loan term must be greater than 0"
        )

    # Convert start_date to IST and check against current IST date
    start_date_ist = to_ist(loan_request.start_date)
    current_ist = get_ist_time()
    if start_date_ist.date() < current_ist.date():
        raise HTTPException(
            status_code=400,
            detail="Start date cannot be in the past (Indian Standard Time)"
        )
        
    new_loan = Loan(
        customer_id=loan_request.customer_id,
        principal_amount=loan_request.principal_amount,
        interest_rate=loan_request.interest_rate,
        loan_term=loan_request.loan_term,
        loan_type=loan_request.loan_type,
        start_date=start_date_ist,
        created_at=current_ist,
        updated_at=current_ist
    )
    
    db.add(new_loan)
    db.commit()
    db.refresh(new_loan)
    
    return {"message": "Loan application submitted successfully", "loan" : new_loan}

@router.get("/{loan_id}", response_model=LoanResponse)
def get_loan(loan_id: int, db: Session = Depends(get_db)):
    loan = ( db.query(Loan) .options(joinedload(Loan.customer)) .filter(Loan.loan_id == loan_id) .first() )
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found"
        )
    return {
        "id": loan.loan_id,
        "customer_name": loan.customer.name,
        "customer_phone_no": loan.customer.phone,
        "customer_email": loan.customer.email,

        "customer_id": loan.customer_id,
        "principal_amount": loan.principal_amount,
        "interest_rate": loan.interest_rate,
        "loan_term": loan.loan_term,
        "loan_type": loan.loan_type,
        "loan_status": loan.loan_status,
        "start_date": loan.start_date,
         "created_at": loan.created_at,
        "updated_at": loan.updated_at,
    }

@router.put("/{loan_id}")
def update_loan(loan_id: int, loan_update: LoanUpdate, db: Session = Depends(get_db)):
    loan = (
        db.query(Loan)
        .filter(Loan.loan_id == loan_id)
        .first()
    )
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found"
        )
    
    update_data = loan_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "start_date" and value is not None:
            value = to_ist(value)
        setattr(loan, field, value)
    loan.updated_at = get_ist_time()
    
    db.commit()
    db.refresh(loan)
    return loan

@router.delete("/{loan_id}")
def delete_loan(loan_id: int, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found"
        )
    db.delete(loan)
    db.commit()
    return {"message": "Loan deleted successfully"}

@router.get("/", response_model=list[LoanResponse])
def get_all_loans(db: Session = Depends(get_db)):

    loans = (
        db.query(Loan)
        .options(joinedload(Loan.customer))
        .all()
    )

    return [
        {
            "id": loan.loan_id,

            "customer_name": loan.customer.name,
            "customer_phone_no": loan.customer.phone,
            "customer_email": loan.customer.email,

            "customer_id": loan.customer_id,
            "principal_amount": loan.principal_amount,
            "interest_rate": loan.interest_rate,
            "loan_term": loan.loan_term,
            "loan_type": loan.loan_type,
            "loan_status": loan.loan_status,
            "start_date": loan.start_date,

            "created_at": loan.created_at,
            "updated_at": loan.updated_at,
        }
        for loan in loans
    ]
@router.put("/{loan_id}/close")
def close_loan(loan_id: int, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found"
        )
    if loan.loan_status == "closed":
        raise HTTPException(
            status_code=400,
            detail="Loan is already closed"
        )
    payments = db.query(Payment).filter(Payment.loan_id == loan_id).all()
    if not payments:
        raise HTTPException(
            status_code=400,
            detail="No payments found for this loan"
        )
    total_payments = sum(payment.principal_amount for payment in payments)
    if round(total_payments, 2) != round(loan.principal_amount, 2):
        raise HTTPException(
            status_code=400,
            detail="Total payments do not match loan amount"
        )
    unpaid_payments = [payment.payment_id for payment in payments if payment.payment_status != "paid"]
    if unpaid_payments:

        raise HTTPException(
            status_code=400,
            detail=f"{len(unpaid_payments)} payment(s) are still unpaid"
        )

    loan.loan_status = "closed"
    loan.close_date = get_ist_time()
    loan.updated_at = get_ist_time()

    db.commit()
    db.refresh(loan)
    return {
        "message": "Loan closed successfully",
        "loan_id": loan.loan_id,
        "loan_status": loan.loan_status
    }