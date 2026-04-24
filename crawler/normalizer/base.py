from dataclasses import dataclass, field
from typing import Optional


@dataclass
class NormalizedRestaurant:
    name: str
    source: str
    address: Optional[str] = None
    phone: Optional[str] = None
    category: Optional[str] = None
    rating: Optional[float] = None
    award: Optional[str] = None
    description: Optional[str] = None
    source_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    dishes: list[dict] = field(default_factory=list)
    hours_raw: Optional[str] = None
    extra: dict = field(default_factory=dict)
