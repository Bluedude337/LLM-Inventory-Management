from fastapi import APIRouter
from fastapi.responses import FileResponse

router = APIRouter()

# Optional landing page (keep if you still use backend/static/landing.html)
@router.get("/")
def landing_page():
    return FileResponse("backend/static/landing.html")

# The new dashboard served by your modular frontend
@router.get("/dashboard")
def dashboard():
    return FileResponse("frontend/dashboard.html")
