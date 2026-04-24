"""미슐랭 가이드 코리아 공개 데이터 시딩"""
from __future__ import annotations
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import os
from app.database import SessionLocal
from app.models.restaurant import Restaurant, RestaurantSource
from crawler.utils.geocoder import geocode
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

KAKAO_KEY = os.environ.get("KAKAO_REST_API_KEY", "")

# 미슐랭 가이드 코리아 2024 공개 데이터
RESTAURANTS = [
    # 3스타
    {"name": "라연", "address": "서울 중구 을지로 30 롯데호텔서울 38층", "category": "한식", "source": "michelin", "award": "3 star"},
    {"name": "권숙수", "address": "서울 강남구 압구정로80길 27", "category": "한식", "source": "michelin", "award": "3 star"},
    {"name": "모수", "address": "서울 용산구 회나무로44길 3", "category": "한식", "source": "michelin", "award": "3 star"},
    {"name": "밍글스", "address": "서울 강남구 도산대로67길 19", "category": "한식", "source": "michelin", "award": "3 star"},
    # 2스타
    {"name": "스시 사이토", "address": "서울 강남구 압구정로 424", "category": "일식", "source": "michelin", "award": "2 star"},
    {"name": "정식당", "address": "서울 강남구 선릉로158길 11", "category": "한식", "source": "michelin", "award": "2 star"},
    {"name": "온지음", "address": "서울 종로구 북촌로5나길 2", "category": "한식", "source": "michelin", "award": "2 star"},
    {"name": "주옥", "address": "서울 강남구 도산대로53길 19", "category": "한식", "source": "michelin", "award": "2 star"},
    {"name": "임프레션", "address": "서울 강남구 언주로164길 30", "category": "양식", "source": "michelin", "award": "2 star"},
    {"name": "보름", "address": "서울 마포구 토정로 344", "category": "한식", "source": "michelin", "award": "2 star"},
    # 1스타
    {"name": "스시 소라", "address": "서울 강남구 압구정로46길 47", "category": "일식", "source": "michelin", "award": "1 star"},
    {"name": "알라프리마", "address": "서울 강남구 언주로168길 22", "category": "양식", "source": "michelin", "award": "1 star"},
    {"name": "아오이토리", "address": "서울 강남구 선릉로155길 9", "category": "일식", "source": "michelin", "award": "1 star"},
    {"name": "스시 아라 by 신종호", "address": "서울 강남구 압구정로80길 46", "category": "일식", "source": "michelin", "award": "1 star"},
    {"name": "제로 컴플렉스", "address": "서울 강남구 도산대로49길 33", "category": "양식", "source": "michelin", "award": "1 star"},
    {"name": "솔밥", "address": "서울 종로구 자하문로7길 30", "category": "한식", "source": "michelin", "award": "1 star"},
    {"name": "스시 카가", "address": "서울 강남구 선릉로150길 32", "category": "일식", "source": "michelin", "award": "1 star"},
    {"name": "목수정", "address": "서울 강남구 학동로97길 32", "category": "한식", "source": "michelin", "award": "1 star"},
    # 빕 구르망
    {"name": "광화문 국밥", "address": "서울 종로구 새문안로 42", "category": "한식", "source": "michelin", "award": "bib gourmand"},
    {"name": "을밀대", "address": "서울 마포구 백범로 173", "category": "한식", "source": "michelin", "award": "bib gourmand"},
    {"name": "우래옥", "address": "서울 중구 창경궁로 62-29", "category": "한식", "source": "michelin", "award": "bib gourmand"},
    {"name": "진진", "address": "서울 마포구 독막로 266", "category": "중식", "source": "michelin", "award": "bib gourmand"},
    {"name": "양미옥", "address": "서울 강남구 봉은사로58길 10", "category": "한식", "source": "michelin", "award": "bib gourmand"},
]


async def seed() -> None:
    db = SessionLocal()
    inserted = skipped = 0

    try:
        for item in RESTAURANTS:
            # 이미 있으면 스킵
            existing = db.query(Restaurant).filter_by(name=item["name"]).first()
            if existing:
                skipped += 1
                continue

            coords = None
            if KAKAO_KEY:
                # 식당명으로 먼저 검색, 안 되면 주소로 시도
                coords = await geocode(item["name"], KAKAO_KEY)
                if not coords:
                    coords = await geocode(item["address"], KAKAO_KEY)
                await asyncio.sleep(0.2)

            if not coords:
                print(f"  [주소 없음] {item['name']}")
                continue

            lat, lng = coords
            r = Restaurant(
                name=item["name"],
                address=item["address"],
                category=item["category"],
                lat=lat,
                lng=lng,
                location=from_shape(Point(lng, lat), srid=4326),
            )
            db.add(r)
            db.flush()

            db.add(RestaurantSource(
                restaurant_id=r.id,
                source=item["source"],
                award=item["award"],
            ))
            db.commit()
            inserted += 1
            print(f"  [insert] {item['name']} ({lat:.4f}, {lng:.4f})")

        print(f"\n완료: {inserted}개 추가, {skipped}개 스킵")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(seed())
