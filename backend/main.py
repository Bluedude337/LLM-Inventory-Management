from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from backend.routers import exits
from backend.routers import exits_print

# Import routers
from backend.routers import products, suppliers, po, pages, auth, entries

from backend.core.database import initialize_database

app = FastAPI(title="LLM Inventory Management Backend")

# Serve legacy static (optional)
app.mount("/static", StaticFiles(directory="backend/static"), name="static")

# API Routers
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["Suppliers"])
app.include_router(po.router, prefix="/api/po", tags=["Purchase Orders"])
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(entries.router, prefix="/api/entries", tags=["Entries"])   # ← FIXED
app.include_router(exits.router, prefix="/api/exits", tags=["Exits"])
app.include_router(exits_print.router, prefix="/api/exits", tags=["Exits Print"])

# Pages Router
app.include_router(pages.router, tags=["Pages"])

# Serve frontend (dashboard)
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

# Initialize database on startup
initialize_database()
