# backend/services/jwt_service.py
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
import os

# ======================================================
# CONFIGURATION (use env var in production)
# ======================================================

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "CHANGE_THIS_TO_A_SECURE_RANDOM_KEY")
ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 15        # short lifetime
REFRESH_TOKEN_EXPIRE_DAYS = 30         # long lifetime


# ======================================================
# HELPERS
# ======================================================

def _now_ts():
    return int(datetime.now(tz=timezone.utc).timestamp())


def _future_ts(minutes: int = 0, days: int = 0):
    dt = datetime.now(tz=timezone.utc) + timedelta(minutes=minutes, days=days)
    return int(dt.timestamp())


# ======================================================
# TOKEN CREATION
# ======================================================

def create_access_token(data: dict):
    """
    Creates a short-lived access token used for API requests.
    Expiration is an integer timestamp (standard).
    """
    to_encode = data.copy()
    expire_ts = _future_ts(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire_ts, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict):
    """
    Creates a long-lived refresh token stored in an HTTP-only cookie.
    """
    to_encode = data.copy()
    expire_ts = _future_ts(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire_ts, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ======================================================
# TOKEN DECODING / VALIDATION
# ======================================================

def decode_token(token: str):
    """
    Decodes a token and returns payload or None on error.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def verify_access_token(token: str):
    """
    Ensures token is an ACCESS token and not expired.
    Returns payload dict or None.
    """
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    # 'exp' is numeric timestamp - jwt.decode already validated expiration
    return payload


def verify_refresh_token(token: str):
    """
    Ensures token is a REFRESH token and not expired.
    Returns payload dict or None.
    """
    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        return None
    return payload
