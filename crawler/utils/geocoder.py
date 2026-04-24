from __future__ import annotations

import httpx

from crawler.utils.rate_limiter import RateLimiter

_limiter = RateLimiter(rate=5.0)  # Kakao allows 5 RPS on free tier


async def geocode(query: str, kakao_rest_key: str) -> tuple[float, float] | None:
    """Returns (lat, lng) or None if not found. Tries address search then keyword search."""
    await _limiter.acquire()
    headers = {"Authorization": f"KakaoAK {kakao_rest_key}"}

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1차: 주소 검색
        resp = await client.get(
            "https://dapi.kakao.com/v2/local/search/address.json",
            headers=headers,
            params={"query": query, "analyze_type": "similar", "size": 1},
        )
        docs = resp.json().get("documents", [])
        if docs:
            return float(docs[0]["y"]), float(docs[0]["x"])

        # 2차: 키워드 검색 (음식점 카테고리)
        await _limiter.acquire()
        resp = await client.get(
            "https://dapi.kakao.com/v2/local/search/keyword.json",
            headers=headers,
            params={"query": query, "category_group_code": "FD6", "size": 1},
        )
        docs = resp.json().get("documents", [])
        if docs:
            return float(docs[0]["y"]), float(docs[0]["x"])

    return None
