from fastapi import APIRouter, HTTPException, Response
from backend.core.database import get_connection
import pandas as pd
import io

router = APIRouter()

@router.get("/")
def list_entries():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT 
            eh.id,
            eh.received_at,
            eh.po_number,
            eh.supplier_cnpj,
            eh.product_code AS product_code,
            eh.description,
            eh.unit,
            eh.qty,
            eh.unit_cost,
            eh.line_total,
            s.name AS supplier_name
        FROM entries_history eh
        LEFT JOIN suppliers s ON s.cnpj = eh.supplier_cnpj
        ORDER BY eh.received_at DESC
    """)

    rows = cur.fetchall()
    conn.close()

    return {"entries": [dict(r) for r in rows]}


# ============================================
# Excel Export
# ============================================

@router.get("/export")
def export_entries_to_excel():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT 
            id, received_at, po_number, supplier_cnpj,
            product_code, description, unit,
            qty, unit_cost, line_total
        FROM entries_history
        ORDER BY received_at DESC
    """)

    rows = [dict(r) for r in cur.fetchall()]
    conn.close()

    df = pd.DataFrame(rows)

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Entries")

    output.seek(0)

    return Response(
        content=output.read(),
        media_type=(
            "application/"
            "vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": "attachment; filename=entries_history.xlsx"
        }
    )
