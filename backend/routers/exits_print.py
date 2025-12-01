# backend/routers/exits_print.py
import io
from typing import List
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.lib import colors
from reportlab.lib.units import mm

from backend.services.exits_service import get_exit_details

router = APIRouter()


def _draw_page_background(c: canvas.Canvas, bg_path: str, page_w, page_h):
    """Draw PNG template as background in landscape orientation."""
    try:
        img = ImageReader(bg_path)
        c.drawImage(img, 0, 0, width=page_w, height=page_h)
    except Exception:
        pass


@router.get("/{exit_id}/pdf", tags=["Exits Print"])
@router.get("/{exit_id}/pdf/", tags=["Exits Print"])
def print_exit_pdf(exit_id: int):
    """
    Generate Exit Request PDF using EXITS-MODEL.png in LANDSCAPE mode.
    Prints only DATE + SECTOR in header and repeats DATE + SECTOR on every row.
    Removes RESPONSIBLE and OBSERVATION.
    """
    details = get_exit_details(exit_id)
    if not details:
        raise HTTPException(status_code=404, detail="Exit not found")

    header = details["exit"]
    items: List[dict] = details["items"] or []

    # -----------------------------------
    # PREPARE PDF
    # -----------------------------------
    buffer = io.BytesIO()
    page_w, page_h = landscape(A4)
    c = canvas.Canvas(buffer, pagesize=landscape(A4))

    bg_path = "frontend/assets/EXITS-MODEL.png"
    _draw_page_background(c, bg_path, page_w, page_h)

    c.setFillColor(colors.black)
    c.setFont("Helvetica", 8)

    # -----------------------------------
    # FORMAT DATE (Brazilian)
    # -----------------------------------
    raw_date = header.get("created_at", "")
    try:
        dt = datetime.fromisoformat(raw_date)
        created_at_br = dt.strftime("%d/%m/%Y")
    except:
        created_at_br = raw_date

    destination = header.get("destination", "")

    # -----------------------------------
    # HEADER (VALUES ONLY)
    # -----------------------------------
    coords = {
        "date":   (52 * mm, page_h - 26.6 * mm),
        "sector": (80 * mm, page_h - 26.6 * mm)
    }


    # -----------------------------------
    # TABLE SETUP (YOUR COORDS KEPT)
    # -----------------------------------
    table_start_y = page_h - 22.2 * mm
    row_height = 4.3 * mm
    max_rows_per_page = int((table_start_y - 20 * mm) // row_height)

    col_x = {
        "date":        52 * mm,
        "sector":      80 * mm,
        "code":        107 * mm,
        "description": 140 * mm,
        "unit":        218 * mm,
        "qty":         240 * mm,
    }

    c.setFont("Helvetica", 8)
    y = table_start_y - row_height
    row_count = 0

    # -----------------------------------
    # TABLE ROWS — DATE + SECTOR REPEATED
    # -----------------------------------
    for item in items:

        if row_count >= max_rows_per_page:
            c.showPage()
            _draw_page_background(c, bg_path, page_w, page_h)
            c.setFont("Helvetica", 8)
            y = table_start_y - row_height
            row_count = 0

        code = str(item.get("product_code", ""))
        desc = str(item.get("description", ""))
        unit = str(item.get("unit", ""))
        qty = str(item.get("qty", ""))

        # DATE + SECTOR repeated on every line
        c.drawString(col_x["date"], y, created_at_br)
        c.drawString(col_x["sector"], y, destination)

        # Product data
        c.drawString(col_x["code"], y, code)

        if len(desc) > 70:
            c.drawString(col_x["description"], y, desc[:70])
            c.drawString(col_x["description"], y - 10, desc[70:140])
        else:
            c.drawString(col_x["description"], y, desc)

        c.drawString(col_x["unit"], y, unit)
        c.drawString(col_x["qty"], y, qty)

        y -= row_height
        row_count += 1

    # -----------------------------------
    # FINISH PDF
    # -----------------------------------
    c.showPage()
    c.save()
    buffer.seek(0)

    filename = f"EXIT_{exit_id}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename=\"{filename}\"'}
    )
