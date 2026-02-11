from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app import config

# HTTPBearer extracts the token from "Authorization: Bearer <token>" header
security = HTTPBearer()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT token.
    Called after successful login in routes.py
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=config.JWT_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def verify_token(token: str) -> dict:
    """
    Verify JWT token signature and expiration.
    Raises 401 if invalid.
    """
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    MIDDLEWARE FUNCTION - This is like checkAuth in Express.js

    How it works:
    1. Depends(security) extracts "Bearer <token>" from request header
    2. We verify the token
    3. If valid → return user data, route continues
    4. If invalid → raise 401, route never runs

    Usage in routes.py:
        @router.get("/protected")
        async def protected_route(user = Depends(get_current_user)):
            # This only runs if token is valid
            # 'user' contains the decoded token payload
    """
    return verify_token(credentials.credentials)
