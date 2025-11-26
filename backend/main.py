from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.core.database import initialize_database

# Import routers
from backend.routers import products, suppliers, po, pages, auth

app = FastAPI(title="LLM Inventory Management Backend")

# If you still use backend/static for landing.html or legacy files, keep this.
# If backend/static is no longer needed, you may delete this mount.
app.mount("/static", StaticFiles(directory="backend/static"), name="static")

# API Routers
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["Suppliers"])
app.include_router(po.router, prefix="/api/po", tags=["Purchase Orders"])
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Pages Router
app.include_router(pages.router, tags=["Pages"])

# Serve the new frontend (dashboard + js/css)
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

# Init DB
initialize_database()