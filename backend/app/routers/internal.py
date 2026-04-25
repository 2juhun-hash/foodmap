from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.restaurant import CrawlLog, Restaurant, RestaurantSource

router = APIRouter(prefix="/internal", tags=["internal"])

SEED_TOKEN = "foodmap-seed-2026"

MICHELIN_DATA = [
    {"name": "라연", "address": "서울 중구 을지로 30 롯데호텔서울 38층", "category": "한식", "award": "3 star", "lat": 37.5657, "lng": 126.9823},
    {"name": "권숙수", "address": "서울 강남구 압구정로80길 27", "category": "한식", "award": "3 star", "lat": 37.5272, "lng": 127.0391},
    {"name": "모수", "address": "서울 용산구 회나무로44길 3", "category": "한식", "award": "3 star", "lat": 37.5384, "lng": 126.9922},
    {"name": "밍글스", "address": "서울 강남구 도산대로67길 19", "category": "한식", "award": "3 star", "lat": 37.5228, "lng": 127.0395},
    {"name": "스시 사이토", "address": "서울 강남구 압구정로 424", "category": "일식", "award": "2 star", "lat": 37.5283, "lng": 127.0404},
    {"name": "정식당", "address": "서울 강남구 선릉로158길 11", "category": "한식", "award": "2 star", "lat": 37.5230, "lng": 127.0440},
    {"name": "온지음", "address": "서울 종로구 북촌로5나길 2", "category": "한식", "award": "2 star", "lat": 37.5800, "lng": 126.9831},
    {"name": "주옥", "address": "서울 강남구 도산대로53길 19", "category": "한식", "award": "2 star", "lat": 37.5218, "lng": 127.0378},
    {"name": "임프레션", "address": "서울 강남구 언주로164길 30", "category": "양식", "award": "2 star", "lat": 37.5222, "lng": 127.0459},
    {"name": "보름", "address": "서울 마포구 토정로 344", "category": "한식", "award": "2 star", "lat": 37.5453, "lng": 126.9499},
    {"name": "스시 소라", "address": "서울 강남구 압구정로46길 47", "category": "일식", "award": "1 star", "lat": 37.5269, "lng": 127.0411},
    {"name": "알라프리마", "address": "서울 강남구 언주로168길 22", "category": "양식", "award": "1 star", "lat": 37.5221, "lng": 127.0462},
    {"name": "아오이토리", "address": "서울 강남구 선릉로155길 9", "category": "일식", "award": "1 star", "lat": 37.5234, "lng": 127.0435},
    {"name": "스시 아라 by 신종호", "address": "서울 강남구 압구정로80길 46", "category": "일식", "award": "1 star", "lat": 37.5271, "lng": 127.0393},
    {"name": "제로 컴플렉스", "address": "서울 강남구 도산대로49길 33", "category": "양식", "award": "1 star", "lat": 37.5213, "lng": 127.0370},
    {"name": "솔밥", "address": "서울 종로구 자하문로7길 30", "category": "한식", "award": "1 star", "lat": 37.5796, "lng": 126.9700},
    {"name": "스시 카가", "address": "서울 강남구 선릉로150길 32", "category": "일식", "award": "1 star", "lat": 37.5232, "lng": 127.0432},
    {"name": "목수정", "address": "서울 강남구 학동로97길 32", "category": "한식", "award": "1 star", "lat": 37.5179, "lng": 127.0355},
    {"name": "광화문 국밥", "address": "서울 종로구 새문안로 42", "category": "한식", "award": "bib gourmand", "lat": 37.5718, "lng": 126.9764},
    {"name": "을밀대", "address": "서울 마포구 백범로 173", "category": "한식", "award": "bib gourmand", "lat": 37.5501, "lng": 126.9551},
    {"name": "우래옥", "address": "서울 중구 창경궁로 62-29", "category": "한식", "award": "bib gourmand", "lat": 37.5696, "lng": 126.9982},
    {"name": "진진", "address": "서울 마포구 독막로 266", "category": "중식", "award": "bib gourmand", "lat": 37.5444, "lng": 126.9486},
    {"name": "양미옥", "address": "서울 강남구 봉은사로58길 10", "category": "한식", "award": "bib gourmand", "lat": 37.5125, "lng": 127.0580},
]


def verify_internal_secret(x_internal_secret: str = Header(...)):
    if x_internal_secret != settings.INTERNAL_API_SECRET:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


@router.get("/crawl-logs", dependencies=[Depends(verify_internal_secret)])
def list_crawl_logs(db: Session = Depends(get_db), limit: int = 20):
    rows = db.query(CrawlLog).order_by(CrawlLog.started_at.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "source": r.source,
            "started_at": r.started_at,
            "finished_at": r.finished_at,
            "total": r.total,
            "inserted": r.inserted,
            "updated": r.updated,
            "errors": r.errors,
            "status": r.status,
        }
        for r in rows
    ]


@router.post("/seed-michelin")
def seed_michelin(token: str, db: Session = Depends(get_db)):
    if token != SEED_TOKEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    inserted = skipped = 0
    for item in MICHELIN_DATA:
        existing = db.query(Restaurant).filter_by(name=item["name"]).first()
        if existing:
            skipped += 1
            continue
        r = Restaurant(
            name=item["name"],
            address=item["address"],
            category=item["category"],
            lat=item["lat"],
            lng=item["lng"],
        )
        db.add(r)
        db.flush()
        db.add(RestaurantSource(
            restaurant_id=r.id,
            source="michelin",
            award=item["award"],
        ))
        db.commit()
        inserted += 1

    return {"inserted": inserted, "skipped": skipped}
