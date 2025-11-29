from fastapi import APIRouter, HTTPException
from backend.core.database import get_connection
import io
from fastapi.responses import StreamingResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image
from backend.services.po_service import receive_po

router = APIRouter()


@router.post("/create/")
def create_po(payload: dict):
    conn = get_connection()
    cur = conn.cursor()
    try:
        # insert header
        cur.execute("""
          INSERT INTO purchase_orders (
              po_code,
              supplier_cnpj, supplier_name, supplier_address, supplier_neighborhood,
              supplier_city, supplier_state, supplier_cep, supplier_pix, supplier_contact,

              buyer_cnpj, buyer_name, buyer_address, buyer_neighborhood,
              buyer_city, buyer_state, buyer_cep, buyer_pix, buyer_contact,

              notes
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            None,
            payload.get("supplier_cnpj"),
            payload.get("supplier_name"),
            payload.get("supplier_address"),
            payload.get("supplier_neighborhood"),
            payload.get("supplier_city"),
            payload.get("supplier_state"),
            payload.get("supplier_cep"),
            payload.get("supplier_pix"),
            payload.get("supplier_contact"),

            payload.get("buyer_cnpj"),
            payload.get("buyer_name"),
            payload.get("buyer_address"),
            payload.get("buyer_neighborhood"),
            payload.get("buyer_city"),
            payload.get("buyer_state"),
            payload.get("buyer_cep"),
            payload.get("buyer_pix"),
            payload.get("buyer_contact"),

            payload.get("notes", "")
        ))

        po_number = cur.lastrowid
        po_code = f"PO{po_number:06d}"

        cur.execute("UPDATE purchase_orders SET po_code = ? WHERE po_number = ?",
                    (po_code, po_number))

        # insert items
        items = payload.get("items", [])
        for it in items:
            qty = float(it.get("qty", 0))
            price = float(it.get("price", 0))
            line_total = qty * price

            cur.execute("""
              INSERT INTO po_items (po_number, item_code, description, unit, qty, unit_price, line_total)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                po_number,
                it.get("code"),
                it.get("description"),
                it.get("unit"),
                qty,
                price,
                line_total
            ))

        conn.commit()
        return {"po_number": po_number, "po_code": po_code}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()

@router.get("/")
def list_pos():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT po_number, po_code, supplier_name, created_at, status FROM purchase_orders ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()
    return {"purchase_orders": [dict(r) for r in rows]}

@router.get("/{po_number}/")
def get_po(po_number: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT
            po_number,
            po_code,

            supplier_cnpj, supplier_name, supplier_address, supplier_neighborhood,
            supplier_city, supplier_state, supplier_cep, supplier_pix, supplier_contact,

            buyer_cnpj, buyer_name, buyer_address, buyer_neighborhood,
            buyer_city, buyer_state, buyer_cep, buyer_pix, buyer_contact,

            created_at, status, notes
        FROM purchase_orders
        WHERE po_number = ?
    """, (po_number,))
    header = cur.fetchone()
    cur.execute("SELECT item_code, description, unit, qty, unit_price, line_total FROM po_items WHERE po_number = ?", (po_number,))
    items = cur.fetchall()
    conn.close()
    return {"header": dict(header) if header else None, "items": [dict(r) for r in items]}

@router.post("/{po_number}/status")
def update_po_status(po_number: int, payload: dict):
    new_status = payload.get("status")

    if new_status not in ("OPEN", "APPROVED", "CANCELLED"):
        raise HTTPException(status_code=400, detail="Invalid status")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT status FROM purchase_orders WHERE po_number = ?", (po_number,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="PO not found")

    current_status = row["status"]

    # Business rules
    if current_status != "OPEN":
        raise HTTPException(status_code=400, detail="Cannot change status of non-OPEN PO")

    cur.execute("""
        UPDATE purchase_orders
        SET status = ?
        WHERE po_number = ?
    """, (new_status, po_number))

    conn.commit()
    conn.close()

    return {"success": True, "new_status": new_status}


# Add this route near other PO endpoints
@router.get("/{po_number}/pdf/", response_class=StreamingResponse)
@router.get("/{po_number}/pdf/", response_class=StreamingResponse)
def download_po_pdf(po_number: int):
    import io
    from fastapi.responses import StreamingResponse
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.utils import ImageReader
    from reportlab.lib import colors

    # -----------------------------
    # Fetch PO Data
    # -----------------------------
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            po_number, po_code,
            supplier_cnpj, supplier_name, supplier_address, supplier_neighborhood,
            supplier_city, supplier_state, supplier_cep, supplier_pix, supplier_contact,
            buyer_cnpj, buyer_name, buyer_address, buyer_neighborhood,
            buyer_city, buyer_state, buyer_cep, buyer_pix, buyer_contact,
            created_at, status, notes
        FROM purchase_orders
        WHERE po_number = ?
    """, (po_number,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="PO not found")
    header = dict(row)

    cur.execute("""
        SELECT item_code, description, unit, qty, unit_price, line_total
        FROM po_items
        WHERE po_number = ?
    """, (po_number,))
    items = [dict(r) for r in cur.fetchall()]
    conn.close()

    # -----------------------------
    # PDF Setup
    # -----------------------------
    buffer = io.BytesIO()
    PAGE_WIDTH, PAGE_HEIGHT = A4
    c = canvas.Canvas(buffer, pagesize=A4)

    # Background template
    template_path = "frontend/assets/po_template.png"
    try:
        bg = ImageReader(template_path)
        c.drawImage(bg, 0, 0, width=PAGE_WIDTH, height=PAGE_HEIGHT)
    except:
        pass

    # Format money
    def fmt(v):
        try:
            return f"R$ {float(v):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        except:
            return str(v)

    c.setFont("Helvetica", 9)

    # ============================================================
    # MANUAL COORDINATES — EDIT FREELY
    # ============================================================

    # ------ Top fields (PIX, date, buyer, seller, phone) ------
    pix_x = 65; pix_y = PAGE_HEIGHT - 162
    date_x = 190; date_y = PAGE_HEIGHT - 162
    seller_name_x = 375; seller_name_y = PAGE_HEIGHT - 162
    seller_phone_x = 455; seller_phone_y = PAGE_HEIGHT - 162

    # ------ Supplier + Buyer block center positions ------
    supplier_center_x = 170
    buyer_center_x    = 420

    supplier_start_y = PAGE_HEIGHT - 80
    buyer_start_y    = PAGE_HEIGHT - 80

    line_spacing = 12

    # ============================================================
    # DRAW TOP FIELDS
    # ============================================================

    # Split seller contact into name + phone
    supplier_contact = header.get("supplier_contact", "")
    parts = supplier_contact.split("-")

    seller_name = parts[0].strip() if len(parts) > 0 else ""
    seller_phone = parts[1].strip() if len(parts) > 1 else ""

    c.drawString(pix_x, pix_y, header.get("supplier_pix",""))
    c.drawString(date_x, date_y, header.get("created_at","")[:10])
    c.drawString(seller_name_x, seller_name_y, seller_name)
    c.drawString(seller_phone_x, seller_phone_y, seller_phone)

    # ============================================================
    # CENTERED SUPPLIER BLOCK
    # ============================================================

    y = supplier_start_y

    def center(text, cx, y):
        c.drawCentredString(cx, y, text)

    center(header.get("supplier_cnpj",""), supplier_center_x, y); y -= line_spacing
    center(header.get("supplier_name",""), supplier_center_x, y); y -= line_spacing
    center(header.get("supplier_address",""), supplier_center_x, y); y -= line_spacing
    center(
        f"{header.get('supplier_neighborhood','')} - "
        f"{header.get('supplier_city','')} - "
        f"{header.get('supplier_state','')}",
        supplier_center_x, y
    ); y -= line_spacing
    center(header.get("supplier_cep",""), supplier_center_x, y); y -= line_spacing

    # ============================================================
    # CENTERED BUYER BLOCK
    # ============================================================

    y = buyer_start_y

    center(header.get("buyer_cnpj",""), buyer_center_x, y); y -= line_spacing
    center(header.get("buyer_name",""), buyer_center_x, y); y -= line_spacing
    center(header.get("buyer_address",""), buyer_center_x, y); y -= line_spacing
    center(
        f"{header.get('buyer_neighborhood','')} - "
        f"{header.get('buyer_city','')} - "
        f"{header.get('buyer_state','')}",
        buyer_center_x, y
    ); y -= line_spacing
    center(header.get("buyer_cep",""), buyer_center_x, y); y -= line_spacing

    # ============================================================
    # PO NUMBER (centerable separately)
    # ============================================================
    po_raw = header.get("po_code") or header.get("po_number")
    po_clean = str(po_raw).replace("PO","")

    po_x = 485
    po_y = PAGE_HEIGHT - 48

    c.setFont("Helvetica-Bold", 12)
    c.drawString(po_x, po_y, po_clean)
    c.setFont("Helvetica", 9)

    # ============================================================
    # ITEMS TABLE (unchanged)
    # ============================================================
    table_xs = {
        "code": 58,
        "desc": 105,
        "unit": 312,
        "qty": 348,
        "unit_price": 400,
        "total": 480
    }
    table_y_start = PAGE_HEIGHT - 240
    row_height = 18
    max_rows_per_page = 18

    c.setFont("Helvetica", 9)
    y = table_y_start - row_height
    subtotal = 0.0
    row_count = 0

    for it in items:
        if row_count >= max_rows_per_page:
            c.showPage()
            try:
                c.drawImage(bg, 0, 0, width=PAGE_WIDTH, height=PAGE_HEIGHT)
            except:
                pass

            c.setFont("Helvetica-Bold", 9)
            c.drawString(table_xs["code"], table_y_start, "Code")
            c.drawString(table_xs["desc"], table_y_start, "Description")
            c.drawString(table_xs["unit"], table_y_start, "Unit")
            c.drawString(table_xs["qty"], table_y_start, "Qty")
            c.drawString(table_xs["unit_price"], table_y_start, "Unit Price")
            c.drawString(table_xs["total"], table_y_start, "Total")

            c.setFont("Helvetica", 9)
            y = table_y_start - row_height
            row_count = 0

        code  = it.get("item_code") or it.get("code") or ""
        desc  = (it.get("description") or "")[:80]
        unit  = it.get("unit") or ""
        qty   = it.get("qty") or 0
        price = it.get("unit_price") or it.get("price") or 0
        total = it.get("line_total") or (float(qty) * float(price))

        c.drawString(table_xs["code"], y, str(code))
        c.drawString(table_xs["desc"], y, desc)
        c.drawString(table_xs["unit"], y, unit)
        c.drawRightString(table_xs["qty"] + 20, y, str(qty))
        c.drawRightString(table_xs["unit_price"] + 40, y, fmt(price))
        c.drawRightString(table_xs["total"] + 40, y, fmt(total))

        subtotal += float(total or 0)
        y -= row_height
        row_count += 1

    # ============================================================
    # TOTAL
    # ============================================================
    total_x = 397.5
    total_y = 100.5

    # Make TOTAL text white
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(total_x + 120, total_y - 18, fmt(subtotal))

    # Reset color if needed for next page or future text
    # c.setFillColorRGB(0, 0, 0)

    c.showPage()
    c.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=PO_{po_clean}.pdf"}
    )


@router.put("/{po_number}/receive")
def receive_purchase_order(po_number: int):
    """
    Change PO status from APPROVED -> RECEIVED,
    update inventory, record received tables.
    """
    try:
        result = receive_po(po_number)
        return {
            "success": True,
            "message": "PO received successfully.",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

