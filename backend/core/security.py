from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from backend.services.jwt_service import verify_access_token
from backend.services.auth_service import get_user


# ====================================
# OAuth2 Bearer Token Configuration
# ====================================

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ====================================
# USER AUTH DEPENDENCY
# ====================================

def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Validates the access token and returns the user object.
    Used as a dependency on all protected routes.
    """

    # 1. Verify token integrity + expiration
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token"
        )

    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject"
        )

    # 2. Retrieve user from the database
    user = get_user(username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user
