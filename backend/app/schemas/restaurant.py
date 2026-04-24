from typing import Optional
from pydantic import BaseModel, ConfigDict


class SourceInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    source: str
    rating: Optional[float] = None
    award: Optional[str] = None
    description: Optional[str] = None
    source_url: Optional[str] = None


class DishInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    price: Optional[int] = None


class HoursInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    day_of_week: int
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    is_closed: bool = False
    break_start: Optional[str] = None
    break_end: Optional[str] = None


class RestaurantSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    thumbnail_url: Optional[str] = None
    sources: list[SourceInfo] = []
    distance_m: Optional[float] = None


class RestaurantDetail(RestaurantSummary):
    road_address: Optional[str] = None
    phone: Optional[str] = None
    dishes: list[DishInfo] = []
    hours: list[HoursInfo] = []


class RestaurantListResponse(BaseModel):
    items: list[RestaurantSummary]
    next_cursor: Optional[str] = None
    total: Optional[int] = None
