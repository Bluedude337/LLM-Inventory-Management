import sqlite3
from datetime import datetime

from fastapi import HTTPException                     # <-- REQUIRED IMPORT FIX

from backend.core.database import get_connection
from backend.services.product_service import subtract_quantity


def create_exit(destination: str, items: list, notes: str = None, created_by: int = None):
    """
    Safely creates an exit with items and subtracts stock.
    Prevents 500 errors by validating every component.
    """

    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        cur = conn.cursor()

        # ------------------------------------------------------
        # 1. CREATE HEADER
        # ------------------------------------------------------
        exit_code = f"EX-{int(datetime.utcnow().timestamp())}"

        cur.execute("""
            INSERT INTO exits (exit_code, destination, created_by, notes)
            VALUES (?, ?, ?, ?)
        """, (exit_code, destination, created_by, notes))

        exit_id = cur.lastrowid

        # ------------------------------------------------------
        # 2. PROCESS ITEMS
        # ------------------------------------------------------
        for item in items:
            product_code = item["product_code"]
            qty = float(item["qty"])
            unit_cost = item.get("unit_cost") or 0.0   # SAFE DEFAULT

            # --- VALIDATE PRODUCT EXISTS ---
            cur.execute("SELECT description, unit, stock FROM products WHERE code = ?", (product_code,))
            prod = cur.fetchone()
            if not prod:
                raise ValueError(f"Product not found: {product_code}")

            description = prod["description"]
            unit = prod["unit"]

            # --- VALIDATE STOCK ---
            if qty > prod["stock"]:
                raise ValueError(f"Insufficient stock for {product_code}")

            # --- UPDATE STOCK ---
            new_stock = prod["stock"] - qty
            cur.execute("UPDATE products SET stock = ? WHERE code = ?", (new_stock, product_code))

            # --- INSERT ITEM ---
            line_total = unit_cost * qty

            cur.execute("""
                INSERT INTO exit_items (exit_id, product_code, description, unit, qty, unit_cost, line_total)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (exit_id, product_code, description, unit, qty, unit_cost, line_total))

            # --- AUDIT LOG ---
            cur.execute("""
                INSERT INTO exits_history (exit_id, product_code, qty, changed_by, action)
                VALUES (?, ?, ?, ?, ?)
            """, (exit_id, product_code, qty, created_by, "CREATE_EXIT"))

        # Commit final
        conn.commit()

        # ------------------------------------------------------
        # 3. RETURN EXIT
        # ------------------------------------------------------
        cur.execute("SELECT * FROM exits WHERE id = ?", (exit_id,))
        exit_header = dict(cur.fetchone())

        cur.execute("SELECT * FROM exit_items WHERE exit_id = ?", (exit_id,))
        exit_items = [dict(row) for row in cur.fetchall()]

        return {"exit": exit_header, "items": exit_items}

    except Exception as e:
        conn.rollback()
        print("EXIT CREATION ERROR:", e)
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        conn.close()


def get_all_exits():
    """
    Returns all exits with no filters.
    """

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, exit_code, destination, created_by, created_at, notes
        FROM exits
        ORDER BY created_at DESC
    """)

    rows = cur.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def get_exit_details(exit_id: int):
    """
    Fetch a complete exit (header + items).
    """

    conn = get_connection()
    cur = conn.cursor()

    # Header
    cur.execute("""
        SELECT id, exit_code, destination, created_by, created_at, notes
        FROM exits
        WHERE id = ?
    """, (exit_id,))
    header = cur.fetchone()

    if not header:
        conn.close()
        return None

    # Items
    cur.execute("""
        SELECT product_code, description, unit, qty, unit_cost, line_total
        FROM exit_items
        WHERE exit_id = ?
    """, (exit_id,))
    items = cur.fetchall()

    conn.close()

    return {
        "exit": dict(header),
        "items": [dict(i) for i in items]
    }
