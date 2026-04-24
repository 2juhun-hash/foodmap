from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.restaurant import RestaurantDetail, RestaurantListResponse
from app.services.restaurant_service import get_nearby_restaurants, get_restaurant_detail

router = APIRouter(prefix="/restaurants", tags=["restaurants"])


@router.get("", response_model=RestaurantListResponse)
def list_restaurants(
    lat: Annotated[float, Query(ge=-90, le=90)],
    lng: Annotated[float, Query(ge=-180, le=180)],
    radius: Annotated[int, Query(ge=100, le=5000)] = 1000,
    sources: Annotated[Optional[list[str]], Query()] = None,
    sort_by: Annotated[str, Query(pattern="^(distance|rating)$")] = "distance",
    cursor: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return get_nearby_restaurants(
        db, lat=lat, lng=lng, radius_m=radius,
        sources=sources, sort_by=sort_by, cursor=cursor,
    )


@router.get("/{restaurant_id}", response_model=RestaurantDetail)
def get_restaurant(restaurant_id: int, db: Session = Depends(get_db)):
    detail = get_restaurant_detail(db, restaurant_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return detail
