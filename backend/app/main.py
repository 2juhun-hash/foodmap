from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers.restaurants import router as restaurants_router
from app.routers.internal import router as internal_router

app = FastAPI(title="FoodMap API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(restaurants_router, prefix="/api/v1")
app.include_router(internal_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
