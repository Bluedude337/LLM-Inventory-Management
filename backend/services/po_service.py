from backend.core.database import get_connection
from fastapi import HTTPException


def receive_po(po_number: int):
    """
    Receives a Purchase Order:
    - Validates status is APPROVED
    - Creates po_received header record
    - Copies items into po_received_items
    - Inserts into entries_history
    - Updates product stock
    - Marks PO as RECEIVED
    """

    conn = get_connection()
    cur = conn.cursor()

    try:
        # ------------------------------------------
        # 1. Load PO header
        # ------------------------------------------
        cur.execute("""
            SELECT
                po_number, po_code,
                supplier_cnpj, supplier_name,
                buyer_cnpj, buyer_name,
                status, notes
            FROM purchase_orders
            WHERE po_number = ?
        """, (po_number,))
        po = cur.fetchone()

        if not po:
            raise HTTPException(status_code=404, detail="PO not found")

        if po["status"] != "APPROVED":
            raise HTTPException(status_code=400, detail="PO must be APPROVED before receiving")

        # ------------------------------------------
        # 2. Load PO items
        # ------------------------------------------
        cur.execute("""
            SELECT item_code, description, unit, qty, unit_price, line_total
            FROM po_items
            WHERE po_number = ?
        """, (po_number,))
        items = cur.fetchall()

        if not items:
            raise HTTPException(status_code=400, detail="PO has no items to receive")

        # ------------------------------------------
        # 3. Calculate total
        # ------------------------------------------
        total_value = sum(float(i["line_total"] or 0) for i in items)

        # ------------------------------------------
        # 4. Create po_received header
        # ------------------------------------------
        cur.execute("""
            INSERT INTO po_received (
                po_number, supplier_cnpj, supplier_name,
                buyer_cnpj, buyer_name,
                total_value, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            po["po_number"],
            po["supplier_cnpj"], po["supplier_name"],
            po["buyer_cnpj"], po["buyer_name"],
            total_value,
            po["notes"]
        ))

        po_received_id = cur.lastrowid

        # ------------------------------------------
        # 5. Insert each received item
        # ------------------------------------------
        for it in items:
            cur.execute("""
                INSERT INTO po_received_items (
                    po_received_id,
                    product_code, description, unit,
                    qty, unit_price, line_total
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                po_received_id,
                it["item_code"],
                it["description"],
                it["unit"],
                it["qty"],
                it["unit_price"],
                it["line_total"]
            ))

        # ------------------------------------------
        # 6. Insert into entries_history
        # ------------------------------------------
        for it in items:
            cur.execute("""
                INSERT INTO entries_history (
                    po_number, supplier_cnpj,
                    product_code, description, unit,
                    qty, unit_cost, line_total
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                po_number,
                po["supplier_cnpj"],
                it["item_code"],
                it["description"],
                it["unit"],
                it["qty"],
                it["unit_price"],
                it["line_total"]
            ))

        # ------------------------------------------
        # 7. Update inventory table -> products.stock
        # ------------------------------------------
        for it in items:
            cur.execute("""
                UPDATE products
                SET stock = stock + ?
                WHERE code = ?
            """, (
                it["qty"],
                it["item_code"]
            ))

        # ------------------------------------------
        # 8. Mark PO as RECEIVED
        # ------------------------------------------
        cur.execute("""
            UPDATE purchase_orders
            SET status = 'RECEIVED', received_at = CURRENT_TIMESTAMP
            WHERE po_number = ?
        """, (po_number,))

        # Commit everything
        conn.commit()

        return {
            "status": "RECEIVED",
            "po_number": po_number,
            "po_received_id": po_received_id,
            "total_received": total_value
        }

    except Exception as e:
        conn.rollback()
        raise e

    finally:
        conn.close()
