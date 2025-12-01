from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date

from backend.services.exits_service import (
    create_exit,
    get_all_exits,
    get_exit_details
)

router = APIRouter()


# ============================================================
# Pydantic Models
# ============================================================

class ExitItemInput(BaseModel):
    product_code: str = Field(..., example="P001")
    qty: float = Field(..., gt=0, example=10)
    unit_cost: Optional[float] = Field(None, example=12.50)


class ExitCreate(BaseModel):
    destination: str = Field(..., example="Client A")
    notes: Optional[str] = Field(None, example="Urgent delivery")
    created_by: Optional[int] = Field(None, example=1)
    items: List[ExitItemInput]


class ExitItemResponse(BaseModel):
    product_code: str
    description: Optional[str]
    unit: Optional[str]
    qty: float
    unit_cost: Optional[float]
    line_total: Optional[float]


class ExitHeaderResponse(BaseModel):
    id: int
    exit_code: str
    destination: str
    created_by: Optional[int]
    created_at: str
    notes: Optional[str]


class ExitDetailResponse(BaseModel):
    exit: ExitHeaderResponse
    items: List[ExitItemResponse]


# ============================================================
# Routes
# ============================================================

@router.post("/create", response_model=ExitDetailResponse)
def create_exit_route(payload: ExitCreate):
    try:
        result = create_exit(
            destination=payload.destination,
            items=[item.dict() for item in payload.items],
            notes=payload.notes,
            created_by=payload.created_by
        )

        return result

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/list")
def list_exits_route(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    destination: Optional[str] = None,
    product_code: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    sort: str = Query("desc", regex="^(asc|desc)$")
):
    """
    Advanced listing with filtering, sorting, and pagination.
    """

    try:
        all_exits = get_all_exits()

        # ------------------------------------------
        # FILTERS
        # ------------------------------------------
        filtered = all_exits

        if destination:
            filtered = [e for e in filtered if destination.lower() in e["destination"].lower()]

        if date_from:
            filtered = [e for e in filtered if e["created_at"] >= date_from.isoformat()]

        if date_to:
            filtered = [e for e in filtered if e["created_at"] <= date_to.isoformat()]

        # Sorting
        filtered = sorted(
            filtered,
            key=lambda e: e["created_at"],
            reverse=(sort == "desc")
        )

        # Pagination
        start = (page - 1) * limit
        end = start + limit
        paginated = filtered[start:end]

        return {
            "success": True,
            "total": len(filtered),
            "page": page,
            "limit": limit,
            "data": paginated
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/{exit_id}", response_model=ExitDetailResponse)
def exit_detail_route(exit_id: int):
    try:
        details = get_exit_details(exit_id)

        if not details:
            raise HTTPException(status_code=404, detail="Exit not found")

        return details

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
