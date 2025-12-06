from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date
import traceback

from backend.core.security import get_current_user
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
    created_by: Optional[int] = Field(None, example=1)   # Ignored (Option C)
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
# CREATE EXIT (Option C: backend determines created_by)
# ============================================================

@router.post("/create", response_model=ExitDetailResponse)
def create_exit_route(payload: ExitCreate, user = Depends(get_current_user)):
    """
    Create a new exit with items.
    Backend automatically sets created_by from authenticated user.
    """
    try:
        # user is a dict → must use ["id"] instead of .id
        result = create_exit(
            destination=payload.destination,
            items=[item.dict() for item in payload.items],
            notes=payload.notes,
            created_by=user["id"]   # <-- FIXED HERE
        )
        return result

    except Exception as e:
        print("\n================ EXIT CREATE ERROR ================")
        traceback.print_exc()
        print("===================================================\n")
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================
# LIST EXITS (filter, sort, pagination)
# ============================================================

@router.get("/list")
def list_exits_route(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    destination: Optional[str] = None,
    product_code: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    sort: str = Query("desc", regex="^(asc|desc)$"),
    user = Depends(get_current_user)
):
    """
    Advanced exit listing with filters and pagination.
    """
    try:
        all_exits = get_all_exits()

        filtered = all_exits

        if destination:
            filtered = [e for e in filtered if destination.lower() in e["destination"].lower()]
        if date_from:
            filtered = [e for e in filtered if e["created_at"] >= date_from.isoformat()]
        if date_to:
            filtered = [e for e in filtered if e["created_at"] <= date_to.isoformat()]

        filtered = sorted(filtered, key=lambda e: e["created_at"], reverse=(sort == "desc"))

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
        print("\n================ EXIT LIST ERROR ================")
        traceback.print_exc()
        print("=================================================\n")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# EXIT DETAIL
# ============================================================

@router.get("/{exit_id}", response_model=ExitDetailResponse)
def exit_detail_route(exit_id: int, user = Depends(get_current_user)):
    """
    Return exit header + items
    """
    try:
        details = get_exit_details(exit_id)
        if not details:
            raise HTTPException(status_code=404, detail="Exit not found")
        return details

    except HTTPException:
        raise

    except Exception as e:
        print("\n================ EXIT DETAIL ERROR ================")
        traceback.print_exc()
        print("===================================================\n")
        raise HTTPException(status_code=500, detail=str(e))
