from fastapi import APIRouter, HTTPException
from backend.core.database import get_connection

router = APIRouter()

# -----------------------------
# GET ALL SUPPLIERS
# -----------------------------
@router.get("/", tags=["Suppliers"])
def get_suppliers():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                cnpj, 
                name, 
                address, 
                neighborhood, 
                city, 
                state, 
                cep, 
                seller, 
                cellphone, 
                pix
            FROM suppliers
        """)
        rows = cur.fetchall()
        suppliers = [dict(row) for row in rows]
        return {"suppliers": suppliers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# -----------------------------
# REGISTER SUPPLIER
# -----------------------------
@router.post("/register/", tags=["Suppliers"])
def register_supplier(item: dict):
    conn = get_connection()
    cur = conn.cursor()

    # Basic validation
    if not item.get("cnpj") or not item.get("name"):
        raise HTTPException(status_code=400, detail="CNPJ and Name are required.")

    try:
        cur.execute("""
            INSERT INTO suppliers (
                cnpj,
                name,
                address,
                neighborhood,
                city,
                state,
                cep,
                seller,
                cellphone,
                pix
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            item["cnpj"],
            item["name"],
            item.get("address", ""),
            item.get("neighborhood", ""),
            item.get("city", ""),
            item.get("state", ""),
            item.get("cep", ""),
            item.get("seller", ""),
            item.get("cellphone", ""),
            item.get("pix", "")  # <-- FIXED: 10th value
        ))

        conn.commit()
        return {"status": "ok", "message": "Supplier registered successfully."}

    except Exception as e:
        # UNIQUE constraint or any other problem
        raise HTTPException(status_code=409, detail=f"Supplier already exists or DB error: {str(e)}")

    finally:
        conn.close()
