# backend/routers/auth.py
from fastapi import APIRouter, HTTPException, Response, Request
from pydantic import BaseModel
import bcrypt

from backend.services.auth_service import get_user, verify_password
from backend.services.jwt_service import (
    create_access_token,
    create_refresh_token,
    verify_refresh_token
)
from backend.core.database import get_connection

router = APIRouter()

# ===================================
# BOOTSTRAP CREDENTIALS (when DB empty)
# ===================================
BOOTSTRAP_USERNAME = "root"
BOOTSTRAP_PASSWORD = "setup123"


# ===================================
# MODELS
# ===================================
class UserLogin(BaseModel):
    username: str
    password: str


class BootstrapAdmin(BaseModel):
    username: str
    password: str


# ===================================
# HELPER — CHECK USER TABLE
# ===================================
def is_user_table_empty():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) AS count FROM users")
    result = cur.fetchone()
    conn.close()
    return result["count"] == 0


# ===================================
# LOGIN ROUTE (bootstrap + normal)
# ===================================
@router.post("/login")
def login(user: UserLogin, response: Response):

    # BOOTSTRAP MODE
    if is_user_table_empty():
        if user.username == BOOTSTRAP_USERNAME and user.password == BOOTSTRAP_PASSWORD:
            return {"bootstrap": True}
        else:
            raise HTTPException(400, "Invalid bootstrap credentials")

    # NORMAL LOGIN
    user_record = get_user(user.username)
    if not user_record or not verify_password(user.password, user_record["password_hash"]):
        raise HTTPException(400, "Invalid username or password")

    # Generate tokens
    access_token = create_access_token({"sub": user.username})
    refresh_token = create_refresh_token({"sub": user.username})

    # Save refresh token in cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/auth"
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username
    }


# ===================================
# BOOTSTRAP ADMIN CREATION
# ===================================
@router.post("/bootstrap-create-admin")
def bootstrap_create_admin(payload: BootstrapAdmin):

    if not is_user_table_empty():
        raise HTTPException(403, "Bootstrap mode disabled — users already exist.")

    conn = get_connection()
    cur = conn.cursor()

    hashed = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode()

    cur.execute("""
        INSERT INTO users (username, password_hash)
        VALUES (?, ?)
    """, (payload.username, hashed))

    conn.commit()
    conn.close()

    return {"success": True, "message": "Master admin account created."}


# ===================================
# REFRESH TOKEN (FIXED)
# ===================================
@router.post("/refresh")
def refresh_token(request: Request):
    """
    Correct refresh: reads refresh token from cookie.
    """

    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(401, "Missing refresh token")

    payload = verify_refresh_token(refresh_token)
    if not payload:
        raise HTTPException(401, "Invalid or expired refresh token")

    username = payload.get("sub")

    # Issue new access token
    new_access_token = create_access_token({"sub": username})

    return {"access_token": new_access_token}


# ===================================
# LOGOUT
# ===================================
@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("refresh_token", path="/auth")
    return {"message": "Logged out"}
