from fastapi import APIRouter, HTTPException
from backend.services.auth_service import create_user, get_user, verify_password

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
def login(data: dict):
    username = data.get("username")
    password = data.get("password")

    user = get_user(username)
    if not user:
        raise HTTPException(404, "User not found")

    if not verify_password(password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")

    return {"status": "ok", "message": "Login successful"}



