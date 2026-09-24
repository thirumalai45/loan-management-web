from app.schemas.customer import CustomerUpdate
from fastapi import APIRouter,Depends,HTTPException,status
from app.schemas.customer import Customerdetials
from app.models.customers import Customer
from database import get_db
from sqlalchemy.orm import Session
from app.utils.timezone import get_ist_time



router = APIRouter(prefix="/customers",tags=["customer"])


@router.post("/add_customer")
def add_customer(customer:Customerdetials ,db:Session = Depends(get_db)):
    new_customer = Customer(
        name=customer.name,
        email=customer.email,
        phone=customer.phone,
        address=customer.address,
        aadhar_number=customer.aadhar_number,
        pan_number=customer.pan_number,
        income_details=customer.income_details
    )

    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return new_customer

@router.get("/get_customer/{customer_id}")
def get_customer(customer_id:int , db:Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer

@router.put("/update_customer/{customer_id}")
def update_customer(
    customer_id: int,
    customer_data: CustomerUpdate,
    db: Session = Depends(get_db)
):
    check_customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id)
        .first()
    )

    if not check_customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )

    update_data = customer_data.dict(exclude_unset=True)

    for field, value in update_data.items():
        setattr(check_customer, field, value)

    check_customer.updated_at = get_ist_time()
    db.commit()
    db.refresh(check_customer)

    return check_customer

@router.delete("/delete_customer/{customer_id}")
def delete_customer(customer_id:int ,db:Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    db.delete(customer)
    db.commit()
    return {"message":"Customer deleted successfully"}

@router.get("/get_all_customers")
def get_all_customers(db:Session = Depends(get_db)):
    customers = db.query(Customer).all()
    return customers
    
