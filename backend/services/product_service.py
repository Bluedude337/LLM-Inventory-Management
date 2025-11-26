from backend.core.database import get_connection


def get_all_products():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT code, category, subcategory, description, unit, stock 
        FROM products
    """)

    rows = cur.fetchall()
    conn.close()

    products = [
        {
            "code": r["code"],
            "category": r["category"],
            "subcategory": r["subcategory"],
            "description": r["description"],
            "unit": r["unit"],
            "stock": r["stock"]
        }
        for r in rows
    ]

    return products


def get_product_by_code(code: str):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT code, category, subcategory, description, unit, stock
        FROM products
        WHERE code = ?
    """, (code,))

    row = cur.fetchone()
    conn.close()

    if not row:
        return None

    return {
        "code": row["code"],
        "category": row["category"],
        "subcategory": row["subcategory"],
        "description": row["description"],
        "unit": row["unit"],
        "stock": row["stock"]
    }


def insert_product(code, category, subcategory, description, unit, stock):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO products (code, category, subcategory, description, unit, stock)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (code, category, subcategory, description, unit, stock))

    conn.commit()
    conn.close()


def update_product(code, category, subcategory, description, unit, stock):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        UPDATE products
        SET category=?, subcategory=?, description=?, unit=?, stock=?
        WHERE code=?
    """, (category, subcategory, description, unit, stock, code))

    conn.commit()
    conn.close()
