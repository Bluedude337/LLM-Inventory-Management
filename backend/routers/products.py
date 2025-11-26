from fastapi import APIRouter, HTTPException
from backend.services.product_service import (
    get_all_products,
    get_product_by_code,
    insert_product,
    update_product
)

router = APIRouter()

# GET ALL PRODUCTS
@router.get("")
@router.get("/")
def api_get_products():
    return {"products": get_all_products()}


# GET PRODUCT BY CODE
@router.get("/{code}")
def api_get_product(code: str):
    product = get_product_by_code(code)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Wrap product into an object to match frontend expectations
    return {"product": product}


# REGISTER PRODUCT
@router.post("/register")
def api_register_product(item: dict):
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
def api_update_product(item: dict):
    update_product(
        item["code"],
        item["category"],
        item["subcategory"],
        item["description"],
        item["unit"],
        int(item["stock"])
    )
    return {"status": "ok", "message": "Item updated successfully"}