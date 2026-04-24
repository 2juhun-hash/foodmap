import re
from typing import Any

from crawler.normalizer.base import NormalizedRestaurant

AWARD_MAP = {
    "3 stars": "3 stars",
    "2 stars": "2 stars",
    "1 star": "1 star",
    "bib gourmand": "bib gourmand",
    "selected": "selected",
}


def normalize(raw: dict[str, Any]) -> NormalizedRestaurant:
    name = (raw.get("name") or "").strip()
    award_raw = (raw.get("distinction") or raw.get("award") or "").lower()
    award = next((v for k, v in AWARD_MAP.items() if k in award_raw), "selected")

    price_raw = raw.get("priceRange") or ""
    price_match = re.search(r"(\d[\d,]+)", price_raw.replace(" ", ""))
    price = int(price_match.group(1).replace(",", "")) if price_match else None

    dishes = []
    for item in raw.get("menuItems") or []:
        dish_name = (item.get("name") or "").strip()
        if dish_name:
            dishes.append({"name": dish_name, "price": None})

    return NormalizedRestaurant(
        name=name,
        source="michelin",
        address=raw.get("streetAddress"),
        phone=raw.get("telephone"),
        category=raw.get("servesCuisine"),
        rating=float(raw.get("aggregateRating", {}).get("ratingValue") or 0) or None,
        award=award,
        description=raw.get("description"),
        source_url=raw.get("url"),
        thumbnail_url=raw.get("image"),
        dishes=dishes,
        extra={"price": price},
    )
