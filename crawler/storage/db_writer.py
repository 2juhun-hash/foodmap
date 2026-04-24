from datetime import datetime, timezone
from typing import Optional

from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy.orm import Session

from app.models.restaurant import CrawlLog, Dish, Restaurant, RestaurantSource
from crawler.normalizer.base import NormalizedRestaurant


def upsert_restaurant(
    db: Session,
    item: NormalizedRestaurant,
    lat: Optional[float],
    lng: Optional[float],
    crawl_log_id: int,
) -> tuple[str, Restaurant]:
    existing = None
    if item.source_url:
        existing = (
            db.query(Restaurant)
            .join(RestaurantSource)
            .filter(RestaurantSource.source_url == item.source_url)
            .first()
        )

    if not existing and lat and lng:
        pass  # future: fuzzy name+distance match

    action = "insert"
    if existing:
        action = "update"
        restaurant = existing
        restaurant.name = item.name
        restaurant.category = item.category or restaurant.category
        restaurant.phone = item.phone or restaurant.phone
        restaurant.thumbnail_url = item.thumbnail_url or restaurant.thumbnail_url
        if lat and lng:
            restaurant.lat = lat
            restaurant.lng = lng
            restaurant.location = from_shape(Point(lng, lat), srid=4326)
    else:
        restaurant = Restaurant(
            name=item.name,
            category=item.category,
            address=item.address,
            phone=item.phone,
            thumbnail_url=item.thumbnail_url,
            lat=lat,
            lng=lng,
            location=from_shape(Point(lng, lat), srid=4326) if lat and lng else None,
        )
        db.add(restaurant)
        db.flush()

    source = (
        db.query(RestaurantSource)
        .filter_by(restaurant_id=restaurant.id, source=item.source)
        .first()
    )
    if source:
        source.rating = item.rating
        source.award = item.award
        source.description = item.description
        source.source_url = item.source_url
        source.extra = item.extra
        source.crawled_at = datetime.now(timezone.utc)
    else:
        db.add(RestaurantSource(
            restaurant_id=restaurant.id,
            source=item.source,
            rating=item.rating,
            award=item.award,
            description=item.description,
            source_url=item.source_url,
            extra=item.extra,
            crawled_at=datetime.now(timezone.utc),
        ))

    for dish_data in item.dishes:
        exists = db.query(Dish).filter_by(
            restaurant_id=restaurant.id, name=dish_data["name"]
        ).first()
        if not exists:
            db.add(Dish(
                restaurant_id=restaurant.id,
                name=dish_data["name"],
                price=dish_data.get("price"),
            ))

    db.flush()
    return action, restaurant


def start_crawl_log(db: Session, source: str) -> CrawlLog:
    log = CrawlLog(source=source, status="running")
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def finish_crawl_log(
    db: Session, log: CrawlLog, total: int, inserted: int, updated: int, errors: int, status: str, error_detail: str = ""
) -> None:
    log.finished_at = datetime.now(timezone.utc)
    log.total = total
    log.inserted = inserted
    log.updated = updated
    log.errors = errors
    log.status = status
    log.error_detail = error_detail or None
    db.commit()
