from fastapi import APIRouter , Depends , HTTPException , status
from app.schemas.login import LoginRequest , LoginResponse
from config import ADMIN_EMAIL , ADMIN_PASSWORD
from auth import create_access_token 

router = APIRouter(prefix="/auth",tags=["Login"])



@router.post("/login",response_model=LoginResponse)
async def login(request:LoginRequest):
    if request.email != ADMIN_EMAIL or request.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = create_access_token()
    
    return LoginResponse(access_token=access_token,token_type="bearer")
