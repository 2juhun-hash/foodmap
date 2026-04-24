from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.restaurant import CrawlLog

router = APIRouter(prefix="/internal", tags=["internal"])


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
