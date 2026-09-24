from app.utils.timezone import to_ist
from app.schemas.payments import PaymentStatusUpdate
from datetime import timedelta
from dateutil.relativedelta import relativedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.services.loan_calculator import calculate_emi
from database import get_db

from app.models.loan import Loan
from app.models.payments import Payment
from app.models.customers import Customer

from app.schemas.payments import PaymentRequest
from app.utils.timezone import get_ist_time


router = APIRouter(
    prefix="/payments",
    tags=["payments"]
)


@router.post("/loans/{loan_id}/payments")
def create_repayment_schedule(
    loan_id: int,
    db: Session = Depends(get_db)
):

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

    existing_payment = (
        db.query(Payment)
        .filter(Payment.loan_id == loan_id)
        .count()
    )

    if existing_payment > 0:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment schedule already exists for this loan"
        )


    loan_type = (loan.loan_type or "").strip().lower()

    emi = calculate_emi(
        principal=loan.principal_amount,
        annual_interest_rate=loan.interest_rate,
        number_of_payments=loan.loan_term,
        frequency=loan_type
    )

    remaining_principal = loan.principal_amount

    current_date = loan.start_date or get_ist_time()

    payment_schedule = []

    for payment_number in range(
        1,
        loan.loan_term + 1
    ):
        if loan_type == "daily":
            period_rate = (
                loan.interest_rate / 100
            ) / 365
            due_date = (
                current_date
                + timedelta(days=1)
            )
        elif loan_type == "weekly":

            period_rate = (
                loan.interest_rate / 100
            ) / 52

            due_date = (
                current_date
                + timedelta(days=7)
            )

        elif loan_type == "monthly":

            period_rate = (
                loan.interest_rate / 100
            ) / 12

            due_date = (
                current_date
                + relativedelta(months=1)
            )

        elif loan_type == "yearly":

            period_rate = (
                loan.interest_rate / 100
            )

            due_date = (
                current_date
                + relativedelta(years=1)
            )

        else:

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid loan type"
            )


        interest_amount = (
            remaining_principal
            * period_rate
        )

        interest_amount = round(
            interest_amount,
            2
        )


        principal_amount = (
            emi - interest_amount
        )

        principal_amount = round(
            principal_amount,
            2
        )

        emi_amount = round(
            emi,
            2
        )


        if payment_number == loan.loan_term:

            principal_amount = round(
                remaining_principal,
                2
            )

            emi_amount = round(
                principal_amount
                + interest_amount,
                2
            )


        remaining_principal = (
            remaining_principal
            - principal_amount
        )

        remaining_principal = round(
            max(remaining_principal, 0),
            2
        )

        new_payment = Payment(

            loan_id=loan.loan_id,

            customer_id=loan.customer_id,

            payment_number=payment_number,

            due_date=due_date,

            emi_amount=emi_amount,

            interest_amount=interest_amount,

            principal_amount=principal_amount,

            payment_status="pending",

            paid_date=None
        )

        payment_schedule.append(new_payment)
        db.add(new_payment)
        current_date = due_date

    db.commit()


    for payment in payment_schedule:

        db.refresh(payment)


    return {

        "message":
            "Payment schedule created successfully",

        "payment_schedule":
            payment_schedule
    }  
        
@router.get("/loans/{loan_id}/payments", response_model=list[PaymentRequest])
def get_payments(loan_id: int, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found"
        )
    payments = db.query(Payment).filter(Payment.loan_id == loan_id).order_by(Payment.payment_number).all()
    if not payments:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No payments found for this loan"
        )
    return payments


@router.put("/{payment_id}/status")
def update_payment_status(
    payment_id: int,
    customer_id: int,
    loan_id: int,
    request: PaymentStatusUpdate,
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(Payment.payment_id == payment_id, Payment.loan_id == loan_id, Payment.customer_id == customer_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    payment.payment_status = request.payment_status.lower()
    if request.paid_date is not None:
        payment.paid_date = to_ist(request.paid_date)
    elif payment.payment_status == "paid":
        payment.paid_date = get_ist_time()
    else:
        payment.paid_date = None
    db.commit()
    db.refresh(payment)
    return {
        "message": "Payment status updated successfully",
        "payment": payment
    }

    
       

    
