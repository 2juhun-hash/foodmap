from datetime import datetime
from typing import Optional

from geoalchemy2 import Geography
from sqlalchemy import (
    BigInteger, Boolean, DateTime, Float, ForeignKey,
    Integer, SmallInteger, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class Restaurant(Base):
    __tablename__ = "restaurants"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    kakao_place_id: Mapped[Optional[str]] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(100))
    address: Mapped[Optional[str]] = mapped_column(String(500))
    road_address: Mapped[Optional[str]] = mapped_column(String(500))
    phone: Mapped[Optional[str]] = mapped_column(String(30))
    lat: Mapped[Optional[float]] = mapped_column(Float)
    lng: Mapped[Optional[float]] = mapped_column(Float)
    location: Mapped[Optional[object]] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), index=True
    )
    thumbnail_url: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    sources: Mapped[list["RestaurantSource"]] = relationship(back_populates="restaurant", cascade="all, delete-orphan")
    dishes: Mapped[list["Dish"]] = relationship(back_populates="restaurant", cascade="all, delete-orphan")
    hours: Mapped[list["BusinessHours"]] = relationship(back_populates="restaurant", cascade="all, delete-orphan")


class RestaurantSource(Base):
    __tablename__ = "restaurant_sources"
    __table_args__ = (UniqueConstraint("restaurant_id", "source", name="uq_restaurant_source"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    restaurant_id: Mapped[int] = mapped_column(ForeignKey("restaurants.id", ondelete="CASCADE"), index=True)
    source: Mapped[str] = mapped_column(String(20), nullable=False)  # michelin | blueribon | sikshin
    source_url: Mapped[Optional[str]] = mapped_column(Text)
    rating: Mapped[Optional[float]] = mapped_column(Float)
    award: Mapped[Optional[str]] = mapped_column(String(100))  # e.g. "1 star", "bib gourmand"
    description: Mapped[Optional[str]] = mapped_column(Text)
    extra: Mapped[Optional[dict]] = mapped_column(JSONB)
    crawled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    restaurant: Mapped["Restaurant"] = relationship(back_populates="sources")


class Dish(Base):
    __tablename__ = "dishes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    restaurant_id: Mapped[int] = mapped_column(ForeignKey("restaurants.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    price: Mapped[Optional[int]] = mapped_column(Integer)

    restaurant: Mapped["Restaurant"] = relationship(back_populates="dishes")


class BusinessHours(Base):
    __tablename__ = "business_hours"
    __table_args__ = (UniqueConstraint("restaurant_id", "day_of_week", name="uq_hours_dow"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    restaurant_id: Mapped[int] = mapped_column(ForeignKey("restaurants.id", ondelete="CASCADE"), index=True)
    day_of_week: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 0=Mon..6=Sun
    open_time: Mapped[Optional[str]] = mapped_column(String(5))   # "HH:MM"
    close_time: Mapped[Optional[str]] = mapped_column(String(5))  # "HH:MM"
    is_closed: Mapped[bool] = mapped_column(Boolean, default=False)
    break_start: Mapped[Optional[str]] = mapped_column(String(5))
    break_end: Mapped[Optional[str]] = mapped_column(String(5))

    restaurant: Mapped["Restaurant"] = relationship(back_populates="hours")


class CrawlLog(Base):
    __tablename__ = "crawl_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(20), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    total: Mapped[int] = mapped_column(Integer, default=0)
    inserted: Mapped[int] = mapped_column(Integer, default=0)
    updated: Mapped[int] = mapped_column(Integer, default=0)
    errors: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="running")  # running | success | failed
    error_detail: Mapped[Optional[str]] = mapped_column(Text)
