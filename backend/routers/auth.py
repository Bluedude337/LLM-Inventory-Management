from fastapi import APIRouter, HTTPException
from backend.services.auth_service import (
    create_user,
    get_user,
    verify_password,
    create_access_token
)

from pydantic import BaseModel

class UserLogin(BaseModel):
    username: str
    password: str


router = APIRouter()

@router.post("/signup")
def signup(data: dict):
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        raise HTTPException(400, "Missing username or password")

    try:
        create_user(username, password)
    except Exception:
        raise HTTPException(409, "User already exists")

    return {"status": "ok", "message": "User created successfully"}


@router.post("/login")
def login(user: UserLogin):
    user_record = get_user(user.username)
    if not user_record:
        raise HTTPException(status_code=400, detail="Invalid username or password")

    if not verify_password(user.password, user_record["password_hash"]):
        raise HTTPException(status_code=400, detail="Invalid username or password")

    # Create token
    access_token = create_access_token({"sub": user.username})

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }



