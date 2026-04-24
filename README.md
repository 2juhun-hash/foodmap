# FoodMap

미슐랭·블루리본·식신 3대 맛집 가이드를 한 지도에서.

## 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, Kakao Maps JS SDK |
| Backend | FastAPI, PostgreSQL + PostGIS, Redis, SQLAlchemy 2, Alembic |
| Crawler | Python (httpx, BeautifulSoup), Kakao Local API (geocoding) |
| Infra | Vercel (frontend), GitHub Actions (crawler) |

## 빠른 시작

### 프론트엔드 (Mock 모드)

```bash
cd frontend
cp .env.example .env.local
# NEXT_PUBLIC_USE_MOCK=true 로 설정하면 백엔드 없이 동작
npm install
npm run dev
```

### 백엔드

```bash
# PostgreSQL + PostGIS 필요
cd backend
cp .env.example .env
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### 크롤러 (수동 실행)

```bash
pip install -r crawler/requirements.txt
KAKAO_REST_API_KEY=xxx DATABASE_URL=postgresql://... python -m crawler.main --source michelin
```

## 환경 변수

### Frontend (`frontend/.env.local`)

| 변수 | 설명 |
|------|------|
| `KAKAO_REST_API_KEY` | 서버 전용 Kakao REST API 키 |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 브라우저 Kakao Maps JS 키 (도메인 제한 필수) |
| `NEXT_PUBLIC_API_URL` | 백엔드 API URL |
| `NEXT_PUBLIC_USE_MOCK` | `true` 시 `data/mock.json` 사용 |

### Backend (`backend/.env`)

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 URL |
| `REDIS_URL` | Redis 연결 URL |
| `KAKAO_REST_API_KEY` | Kakao REST API 키 |
| `INTERNAL_API_SECRET` | 내부 API 인증 시크릿 |
| `CORS_ORIGINS` | 허용 오리진 목록 (JSON 배열) |

## API

`GET /api/v1/restaurants?lat=37.5&lng=127.0&radius=1000&sources=michelin&sort_by=distance&cursor=...`

`GET /api/v1/restaurants/{id}`

## 크롤러 스케줄

GitHub Actions에서 매주 월요일 02:00 UTC 자동 실행 (`.github/workflows/crawl-michelin.yml`).
블루리본·식신 크롤러는 별도 구현 예정.
