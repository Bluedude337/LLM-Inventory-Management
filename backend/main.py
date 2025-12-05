from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.routers import (
    products,
    suppliers,
    entries,
    exits,
    exits_print,
    po,
    auth,
    pages
)

from backend.core.database import initialize_database


app = FastAPI()

# -------------------------
# CORS CONFIGURATION
# -------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],         # adjust for production
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True       # needed for refresh cookie
)

# -------------------------
# DATABASE INITIALIZATION
# -------------------------
initialize_database()

# -------------------------
# ROUTERS
# -------------------------
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])

app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["Suppliers"])
app.include_router(entries.router, prefix="/api/entries", tags=["Entries"])
app.include_router(exits.router, prefix="/api/exits", tags=["Exits"])

# 🔧 FIX APPLIED HERE
# Separate prefix prevents override issues
app.include_router(exits_print.router, prefix="/api/exits-print", tags=["Exits Print"])

app.include_router(po.router, prefix="/api/po", tags=["Purchase Orders"])

# Pages router (must remain public)
app.include_router(pages.router)

# Serve frontend
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
