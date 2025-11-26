from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from backend.core.database import get_connection
import io
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from datetime import datetime

router = APIRouter()

# existing list/get/create endpoints should remain above (keep them).
# Below we add status update & PDF generation.

@router.post("/{po_number}/status/", tags=["Purchase Orders"])
def update_po_status(po_number: int, payload: dict):
    """
    payload: {"status": "APPROVED"} or {"status": "CANCELLED"}
    """
    new_status = payload.get("status")
    if new_status not in ("OPEN", "APPROVED", "CANCELLED"):
        raise HTTPException(status_code=400, detail="Invalid status")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT po_number, status FROM purchase_orders WHERE po_number = ?", (po_number,))
    row = cur.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="PO not found")

    cur.execute("UPDATE purchase_orders SET status = ? WHERE po_number = ?", (new_status, po_number))
    conn.commit()
    conn.close()
    return {"status": "ok", "po_number": po_number, "new_status": new_status}


@router.get("/{po_number}/pdf/", tags=["Purchase Orders"])
def get_po_pdf(po_number: int):
    """
    Generate a simple PDF for the PO and return it.
    Uses a programmatic layout so you get a working PDF immediately.
    We can later switch this to fill your uploaded PDF template.
    """
    conn = get_connection()
    cur = conn.cursor()

    # header
    cur.execute("SELECT * FROM purchase_orders WHERE po_number = ?", (po_number,))
    header = cur.fetchone()
    if not header:
        conn.close()
        raise HTTPException(status_code=404, detail="PO not found")

    cur.execute("SELECT item_code, description, unit, qty, unit_price, line_total FROM po_items WHERE po_number = ?", (po_number,))
    items = cur.fetchall()
    conn.close()

    # Create PDF in memory
    buf = io.BytesIO()
    p = canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    # Simple header
    p.setFont("Helvetica-Bold", 14)
    p.drawString(40, height - 60, f"Purchase Order: {header['po_code'] or header['po_number']}")
    p.setFont("Helvetica", 10)
    p.drawString(40, height - 80, f"Date: {header['created_at']}")
    p.drawString(40, height - 95, f"Supplier: {header.get('supplier_name','')}")
    p.drawString(40, height - 110, f"CNPJ: {header.get('supplier_cnpj','')}")
    p.drawString(40, height - 125, f"Address: {header.get('supplier_address','')} {header.get('supplier_neighborhood','')}")
    p.drawString(40, height - 140, f"{header.get('supplier_city','')} - {header.get('supplier_state','')}  CEP: {header.get('supplier_cep','')}")
    p.drawString(40, height - 155, f"PIX: {header.get('supplier_pix','')}  Contact: {header.get('supplier_contact','')}")

    # Table header
    y = height - 185
    p.setFont("Helvetica-Bold", 10)
    p.drawString(40, y, "Code")
    p.drawString(110, y, "Description")
    p.drawString(350, y, "Unit")
    p.drawString(400, y, "Qty")
    p.drawString(450, y, "Unit Price")
    p.drawString(520, y, "Total")
    p.setFont("Helvetica", 10)
    y -= 16

    total_sum = 0.0
    for it in items:
        # it: dict-like row; convert if necessary
        code = it["item_code"]
        desc = it["description"]
        unit = it["unit"] or ""
        qty = it["qty"] or 0
        unit_price = it["unit_price"] or 0.0
        line_total = it["line_total"] or (qty * unit_price)
        total_sum += float(line_total)

        p.drawString(40, y, str(code))
        p.drawString(110, y, str(desc)[:40])
        p.drawString(350, y, str(unit))
        p.drawString(400, y, str(qty))
        p.drawString(450, y, f"{unit_price:.2f}")
        p.drawString(520, y, f"{line_total:.2f}")
        y -= 14
        if y < 80:
            p.showPage()
            y = height - 60

    # Totals
    y -= 10
    p.setFont("Helvetica-Bold", 11)
    p.drawString(400, y, "Total:")
    p.drawString(520, y, f"{total_sum:.2f}")

    # Footer
    p.showPage()
    p.save()
    buf.seek(0)

    filename = f"PO_{header['po_code'] or header['po_number']}.pdf"
    return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})
