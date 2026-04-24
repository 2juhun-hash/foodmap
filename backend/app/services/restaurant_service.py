import base64
import json
from typing import Optional

from sqlalchemy import func, literal_column, select, text
from sqlalchemy.orm import Session, selectinload

from app.models.restaurant import Restaurant, RestaurantSource
from app.schemas.restaurant import RestaurantListResponse, RestaurantSummary, RestaurantDetail

SOURCES_ALL = {"michelin", "blueribon", "sikshin"}
PAGE_SIZE = 20


def _encode_cursor(restaurant_id: int, distance_m: float) -> str:
    payload = json.dumps({"id": restaurant_id, "d": distance_m})
    return base64.urlsafe_b64encode(payload.encode()).decode()


def _decode_cursor(cursor: str) -> tuple[int, float]:
    payload = json.loads(base64.urlsafe_b64decode(cursor).decode())
    return payload["id"], payload["d"]


def get_nearby_restaurants(
    db: Session,
    lat: float,
    lng: float,
    radius_m: int = 1000,
    sources: Optional[list[str]] = None,
    sort_by: str = "distance",
    cursor: Optional[str] = None,
    limit: int = PAGE_SIZE,
) -> RestaurantListResponse:
    point = f"ST_SetSRID(ST_MakePoint({lng}, {lat}), 4326)"
    distance_expr = text(f"ST_Distance(location::geography, {point})")

    q = (
        select(
            Restaurant,
            literal_column(f"ST_Distance(location::geography, {point})").label("distance_m"),
        )
        .where(
            text(f"ST_DWithin(location::geography, {point}::geography, {radius_m})")
        )
        .options(selectinload(Restaurant.sources))
    )

    if sources:
        valid = [s for s in sources if s in SOURCES_ALL]
        if valid:
            q = q.where(
                Restaurant.id.in_(
                    select(RestaurantSource.restaurant_id).where(
                        RestaurantSource.source.in_(valid)
                    )
                )
            )

    if cursor:
        cursor_id, cursor_dist = _decode_cursor(cursor)
        if sort_by == "distance":
            q = q.where(
                text(f"ST_Distance(location::geography, {point}) > {cursor_dist}")
                | (
                    (text(f"ST_Distance(location::geography, {point}) = {cursor_dist}"))
                    & (Restaurant.id > cursor_id)
                )
            )

    if sort_by == "distance":
        q = q.order_by(text(f"ST_Distance(location::geography, {point})"), Restaurant.id)
    else:
        q = q.order_by(Restaurant.id)

    rows = db.execute(q.limit(limit + 1)).all()

    has_more = len(rows) > limit
    rows = rows[:limit]

    items = []
    for row in rows:
        r: Restaurant = row[0]
        dist: float = row[1] or 0.0
        summary = RestaurantSummary(
            id=r.id,
            name=r.name,
            category=r.category,
            address=r.address,
            lat=r.lat,
            lng=r.lng,
            thumbnail_url=r.thumbnail_url,
            sources=[s for s in r.sources],
            distance_m=round(dist, 1),
        )
        items.append(summary)

    next_cursor = None
    if has_more and items:
        last = items[-1]
        next_cursor = _encode_cursor(last.id, last.distance_m or 0.0)

    return RestaurantListResponse(items=items, next_cursor=next_cursor)


def get_restaurant_detail(db: Session, restaurant_id: int) -> Optional[RestaurantDetail]:
    row = db.execute(
        select(Restaurant)
        .where(Restaurant.id == restaurant_id)
        .options(
            selectinload(Restaurant.sources),
            selectinload(Restaurant.dishes),
            selectinload(Restaurant.hours),
        )
    ).scalar_one_or_none()

    if not row:
        return None

    return RestaurantDetail(
        id=row.id,
        name=row.name,
        category=row.category,
        address=row.address,
        road_address=row.road_address,
        phone=row.phone,
        lat=row.lat,
        lng=row.lng,
        thumbnail_url=row.thumbnail_url,
        sources=list(row.sources),
        dishes=list(row.dishes),
        hours=list(row.hours),
    )
