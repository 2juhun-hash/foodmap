"""mock.json 데이터를 DB에 임포트"""
from __future__ import annotations
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.restaurant import Restaurant, RestaurantSource
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

MOCK_PATH = Path(__file__).parent.parent / "frontend" / "data" / "mock.json"

SOURCE_TYPE_MAP = {
    "michelin": "michelin",
    "blueribbon": "blueribon",
    "sikshin": "sikshin",
}


def import_mock(db: Session) -> None:
    data = json.loads(MOCK_PATH.read_text())
    items = data["items"]
    inserted = 0

    for item in items:
        lat = item["location"]["lat"]
        lng = item["location"]["lng"]

        r = Restaurant(
            name=item["name"],
            category=item.get("category"),
            address=item.get("address"),
            phone=item.get("phone"),
            lat=lat,
            lng=lng,
            location=from_shape(Point(lng, lat), srid=4326),
            thumbnail_url=(item.get("images") or [None])[0],
        )
        db.add(r)
        db.flush()

        for src in item.get("sources", []):
            source_key = SOURCE_TYPE_MAP.get(src["source_type"], src["source_type"])
            grade_type = src.get("grade_type", "")
            award = None
            rating = None

            if grade_type == "star":
                award = f"{src.get('grade', '')} star"
            elif grade_type == "ribbon":
                award = f"{src.get('grade', '')} ribbon"
            elif grade_type == "score":
                rating = src.get("score")

            rs = RestaurantSource(
                restaurant_id=r.id,
                source=source_key,
                source_url=src.get("source_url"),
                award=award,
                rating=rating,
            )
            db.add(rs)

        inserted += 1

    db.commit()
    print(f"임포트 완료: {inserted}개 레스토랑")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        import_mock(db)
    finally:
        db.close()
