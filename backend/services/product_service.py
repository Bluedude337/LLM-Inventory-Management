from backend.core.database import get_connection
import sqlite3


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


# ============================================================
# NEW FUNCTION: Subtract stock for EXITS module
# ============================================================

def subtract_quantity(product_code: str, quantity: float, conn: sqlite3.Connection = None):
    """
    Subtracts stock safely.
    If conn is provided, DO NOT start or commit a transaction.
    If conn is None, manage the full transaction internally.
    """

    own_conn = False

    if conn is None:
        conn = get_connection()
        own_conn = True
        conn.execute("BEGIN IMMEDIATE")   # we manage transaction only if we own connection

    try:
        cur = conn.cursor()

        # Fetch product
        cur.execute("""
            SELECT code, description, unit, stock
            FROM products
            WHERE code = ?
        """, (product_code,))
        product = cur.fetchone()

        if not product:
            raise ValueError(f"Product '{product_code}' does not exist.")

        if quantity > product["stock"]:
            raise ValueError(
                f"Insufficient stock for '{product_code}'. "
                f"Available: {product['stock']}, Requested: {quantity}"
            )

        new_stock = product["stock"] - quantity

        # Update stock
        cur.execute("""
            UPDATE products
            SET stock = ?
            WHERE code = ?
        """, (new_stock, product_code))

        # Commit only if we opened the transaction
        if own_conn:
            conn.commit()

        return {
            "code": product["code"],
            "description": product["description"],
            "unit": product["unit"],
            "stock": new_stock
        }

    except Exception as e:
        if own_conn:
            conn.rollback()
        raise e

    finally:
        if own_conn:
            conn.close()

