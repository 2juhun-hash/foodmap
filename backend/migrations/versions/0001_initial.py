"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-24
"""
from alembic import op
import sqlalchemy as sa
revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "restaurants",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("kakao_place_id", sa.String(32), unique=True, nullable=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("road_address", sa.String(500), nullable=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("lat", sa.Float, nullable=True),
        sa.Column("lng", sa.Float, nullable=True),
        sa.Column("thumbnail_url", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_restaurants_kakao_place_id", "restaurants", ["kakao_place_id"])

    op.create_table(
        "restaurant_sources",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("restaurant_id", sa.BigInteger, sa.ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("source_url", sa.Text, nullable=True),
        sa.Column("rating", sa.Float, nullable=True),
        sa.Column("award", sa.String(100), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("extra", sa.dialects.postgresql.JSONB, nullable=True),
        sa.Column("crawled_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("restaurant_id", "source", name="uq_restaurant_source"),
    )
    op.create_index("ix_restaurant_sources_restaurant_id", "restaurant_sources", ["restaurant_id"])

    op.create_table(
        "dishes",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("restaurant_id", sa.BigInteger, sa.ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("price", sa.Integer, nullable=True),
    )
    op.create_index("ix_dishes_restaurant_id", "dishes", ["restaurant_id"])

    op.create_table(
        "business_hours",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("restaurant_id", sa.BigInteger, sa.ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day_of_week", sa.SmallInteger, nullable=False),
        sa.Column("open_time", sa.String(5), nullable=True),
        sa.Column("close_time", sa.String(5), nullable=True),
        sa.Column("is_closed", sa.Boolean, default=False),
        sa.Column("break_start", sa.String(5), nullable=True),
        sa.Column("break_end", sa.String(5), nullable=True),
        sa.UniqueConstraint("restaurant_id", "day_of_week", name="uq_hours_dow"),
    )
    op.create_index("ix_business_hours_restaurant_id", "business_hours", ["restaurant_id"])

    op.create_table(
        "crawl_logs",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total", sa.Integer, default=0),
        sa.Column("inserted", sa.Integer, default=0),
        sa.Column("updated", sa.Integer, default=0),
        sa.Column("errors", sa.Integer, default=0),
        sa.Column("status", sa.String(20), default="running"),
        sa.Column("error_detail", sa.Text, nullable=True),
    )


def downgrade() -> None:
    op.drop_table("crawl_logs")
    op.drop_table("business_hours")
    op.drop_table("dishes")
    op.drop_table("restaurant_sources")
    op.drop_table("restaurants")
