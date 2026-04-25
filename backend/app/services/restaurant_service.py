import base64
import json
import math
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.restaurant import Restaurant, RestaurantSource
from app.schemas.restaurant import RestaurantListResponse, RestaurantSummary, RestaurantDetail

SOURCES_ALL = {"michelin", "blueribon", "sikshin"}
PAGE_SIZE = 20


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


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
    # bounding box pre-filter (1 degree lat ≈ 111km)
    lat_delta = radius_m / 111_000
    lng_delta = radius_m / (111_000 * math.cos(math.radians(lat)))

    q = (
        select(Restaurant)
        .where(
            Restaurant.lat.between(lat - lat_delta, lat + lat_delta),
            Restaurant.lng.between(lng - lng_delta, lng + lng_delta),
            Restaurant.lat.is_not(None),
            Restaurant.lng.is_not(None),
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

    rows = db.execute(q).scalars().all()

    # exact distance filter + sort in Python
    with_dist = []
    for r in rows:
        d = _haversine_m(lat, lng, r.lat, r.lng)
        if d <= radius_m:
            with_dist.append((r, d))

    if sort_by == "distance":
        with_dist.sort(key=lambda x: (x[1], x[0].id))
    else:
        with_dist.sort(key=lambda x: x[0].id)

    # cursor pagination
    if cursor:
        cursor_id, cursor_dist = _decode_cursor(cursor)
        if sort_by == "distance":
            with_dist = [
                (r, d) for r, d in with_dist
                if d > cursor_dist or (d == cursor_dist and r.id > cursor_id)
            ]

    has_more = len(with_dist) > limit
    with_dist = with_dist[:limit]

    items = []
    for r, dist in with_dist:
        items.append(RestaurantSummary(
            id=r.id,
            name=r.name,
            category=r.category,
            address=r.address,
            lat=r.lat,
            lng=r.lng,
            thumbnail_url=r.thumbnail_url,
            sources=list(r.sources),
            distance_m=round(dist, 1),
        ))

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
