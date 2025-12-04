from fastapi import APIRouter, HTTPException, Depends
from backend.services.product_service import (
    get_all_products,
    get_product_by_code,
    insert_product,
    update_product
)
from backend.core.security import get_current_user

router = APIRouter()

# GET ALL PRODUCTS
@router.get("")
@router.get("/")
def api_get_products(current_user = Depends(get_current_user)):
    return {"products": get_all_products()}


# GET PRODUCT BY CODE
@router.get("/{code}")
def api_get_product(code: str, current_user = Depends(get_current_user)):
    product = get_product_by_code(code)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Wrap product into an object to match frontend expectations
    return {"product": product}


# REGISTER PRODUCT
@router.post("/register")
def api_register_product(item: dict, current_user = Depends(get_current_user)):
    insert_product(
        item["code"],
        item["category"],
        item["subcategory"],
        item["description"],
        item["unit"],
        int(item["stock"])
    )
    return {"status": "ok", "message": "Item registered successfully"}


# UPDATE PRODUCT
@router.post("/update")
def api_update_product(item: dict, current_user = Depends(get_current_user)):
    update_product(
        item["code"],
        item["category"],
        item["subcategory"],
        item["description"],
        item["unit"],
        int(item["stock"])
    )
    return {"status": "ok", "message": "Item updated successfully"}
