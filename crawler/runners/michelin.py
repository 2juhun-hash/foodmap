"""
Michelin Guide Korea scraper — Playwright 기반.
JavaScript 렌더링 후 restaurant URL 수집, JSON-LD 파싱.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.database import SessionLocal
from crawler.normalizer.michelin_normalizer import normalize
from crawler.storage.db_writer import finish_crawl_log, start_crawl_log, upsert_restaurant
from crawler.utils.geocoder import geocode

log = logging.getLogger(__name__)

SEARCH_URL = "https://guide.michelin.com/kr/ko/restaurants"
KAKAO_KEY = os.environ.get("KAKAO_REST_API_KEY", "")


async def fetch_restaurant_urls(page) -> list[str]:
    urls: list[str] = []
    p = 1
    while p <= 50:
        await page.goto(f"{SEARCH_URL}?page={p}", wait_until="networkidle", timeout=30000)
        cards = await page.query_selector_all("a.link-to-restaurant")
        if not cards:
            break
        for card in cards:
            href = await card.get_attribute("href")
            if href and href not in urls:
                full = href if href.startswith("http") else f"https://guide.michelin.com{href}"
                urls.append(full)
        log.info("Page %d: %d URLs so far", p, len(urls))
        p += 1
        await asyncio.sleep(1)
    return urls


async def fetch_json_ld(page, url: str) -> dict | None:
    try:
        await page.goto(url, wait_until="networkidle", timeout=30000)
        content = await page.inner_text('script[type="application/ld+json"]')
        return json.loads(content)
    except Exception as exc:
        log.warning("fetch error %s: %s", url, exc)
        return None


async def run() -> None:
    db = SessionLocal()
    crawl_log = start_crawl_log(db, "michelin")
    total = inserted = updated = errors = 0

    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                locale="ko-KR",
            )
            page = await context.new_page()

            urls = await fetch_restaurant_urls(page)
            total = len(urls)
            log.info("Found %d Michelin restaurant URLs", total)

            for url in urls:
                raw = await fetch_json_ld(page, url)
                if not raw:
                    errors += 1
                    continue
                raw["url"] = url
                item = normalize(raw)

                coords = None
                if item.address and KAKAO_KEY:
                    coords = await geocode(item.address, KAKAO_KEY)

                lat = coords[0] if coords else None
                lng = coords[1] if coords else None

                try:
                    action, _ = upsert_restaurant(db, item, lat, lng, crawl_log.id)
                    db.commit()
                    if action == "insert":
                        inserted += 1
                    else:
                        updated += 1
                    log.info("[%s] %s (lat=%s, lng=%s)", action, item.name, lat, lng)
                except Exception as exc:
                    db.rollback()
                    log.error("db error for %s: %s", url, exc)
                    errors += 1

                await asyncio.sleep(0.5)

            await browser.close()

        finish_crawl_log(db, crawl_log, total, inserted, updated, errors, "success")
        log.info("Done: inserted=%d updated=%d errors=%d", inserted, updated, errors)

    except Exception as exc:
        finish_crawl_log(db, crawl_log, total, inserted, updated, errors, "failed", str(exc))
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    asyncio.run(run())
