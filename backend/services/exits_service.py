import sqlite3
from datetime import datetime

from backend.core.database import get_connection
from backend.services.product_service import subtract_quantity


def create_exit(destination: str, items: list, notes: str = None, created_by: int = None):
    """
    Creates a new exit record with items and subtracts stock.

    Parameters:
        destination (str): Where the products are going.
        items (list): List of dictionaries:
                      {
                          "product_code": str,
                          "qty": float,
                          "unit_cost": float | None  # optional
                      }
        notes (str): Additional notes.
        created_by (int): User ID who created the exit.

    Returns:
        dict: A full exit record with items.
    """

    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")  # ensures safe write-lock

        cur = conn.cursor()

        # ----------------------------------------------------------
        # 1. Create EXIT header
        # ----------------------------------------------------------
        exit_code = f"EX-{int(datetime.utcnow().timestamp())}"

        cur.execute("""
            INSERT INTO exits (exit_code, destination, created_by, notes)
            VALUES (?, ?, ?, ?)
        """, (exit_code, destination, created_by, notes))

        exit_id = cur.lastrowid

        # ----------------------------------------------------------
        # 2. Process each item
        # ----------------------------------------------------------
        for item in items:
            product_code = item["product_code"]
            qty = float(item["qty"])
            unit_cost = item.get("unit_cost")

            # Subtract stock (within same transaction)
            updated = subtract_quantity(product_code, qty, conn=conn)

            # Fetch product details again (for description/unit)
            description = updated["description"]
            unit = updated["unit"]

            line_total = None
            if unit_cost is not None:
                line_total = unit_cost * qty

            # Insert into exit_items
            cur.execute("""
                INSERT INTO exit_items (exit_id, product_code, description, unit, qty, unit_cost, line_total)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (exit_id, product_code, description, unit, qty, unit_cost, line_total))

            # Insert audit log
            cur.execute("""
                INSERT INTO exits_history (exit_id, product_code, qty, changed_by, action)
                VALUES (?, ?, ?, ?, ?)
            """, (exit_id, product_code, qty, created_by, "CREATE_EXIT"))

        # Commit everything
        conn.commit()

        # ----------------------------------------------------------
        # 3. Return usable structured exit info
        # ----------------------------------------------------------
        cur.execute("SELECT * FROM exits WHERE id = ?", (exit_id,))
        exit_header = dict(cur.fetchone())

        cur.execute("SELECT * FROM exit_items WHERE exit_id = ?", (exit_id,))
        exit_items = [dict(row) for row in cur.fetchall()]

        return {
            "exit": exit_header,
            "items": exit_items
        }

    except Exception as e:
        conn.rollback()
        raise e

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
