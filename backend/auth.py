from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
from fastapi.security import HTTPAuthorizationCredentials , HTTPBearer
from fastapi import Depends, HTTPException, status


from config import JWT_SECRET, JWT_ALGORITHMS, JWT_EXPIRE_MINUTES , ADMIN_EMAIL

security = HTTPBearer()


def create_access_token():
    """Create and return a JWT access token for the admin user"""
    expire = datetime.now() + timedelta(minutes=int(JWT_EXPIRE_MINUTES))

    to_encode = {"sub" : ADMIN_EMAIL, "role" : "ADMIN","exp": expire}

    token = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHMS)

    return token


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Decode and validate the JWT access token"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token,JWT_SECRET,algorithms=JWT_ALGORITHMS)

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token",headers={"WWW-Authenticate": "Bearer"})
    email = payload.get("sub")
    role = payload.get("role")
    if not email or role !="ADMIN":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token",headers={"WWW-Authenticate": "Bearer"})
    return {"email": email,"role":role}