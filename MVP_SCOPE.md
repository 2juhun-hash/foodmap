# FoodMap MVP Scope

**작성일:** 2026-04-24  
**대상 릴리스:** v0.1 (MVP)

---

## 포함 범위 (In Scope)

### 핵심 기능
| # | 기능 | 설명 |
|---|------|------|
| F-01 | 현재 위치 기반 맛집 탐색 | GPS 또는 주소 검색으로 반경 내 맛집 목록 |
| F-02 | 가이드 소스 필터 | 미슐랭·블루리본·식신 중 선택 (복수 선택 가능) |
| F-03 | 지도 + 목록 뷰 | 카카오맵 마커 + 목록 패널, 모바일 탭 전환 |
| F-04 | 맛집 상세 정보 | 주소·전화·영업시간·대표 메뉴·가이드 등급 |
| F-05 | 거리순 정렬 | 가까운 순서로 목록 정렬 |
| F-06 | 무한 스크롤 | cursor 기반 페이지네이션 |
| F-07 | 미슐랭 데이터 수집 | GitHub Actions 자동 크롤러 (주 1회) |

### 기술 스택
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Zustand, Kakao Maps JS SDK
- **Backend:** FastAPI, PostgreSQL + PostGIS, Alembic
- **Crawler:** Python, httpx, BeautifulSoup, Kakao Local API
- **배포:** Vercel (frontend), 별도 서버 또는 Cloud Run (backend)

---

## 제외 범위 (Out of Scope for MVP)

| 항목 | 이유 | 향후 계획 |
|------|------|-----------|
| 블루리본·식신 크롤러 | 사이트 구조 분석 필요, 별도 공수 | v0.2 |
| 회원가입·로그인 | 인증 인프라 불필요, 익명 사용으로 충분 | v0.3 |
| 즐겨찾기·저장 | 로그인 선행 필요 | v0.3 |
| 리뷰·별점 직접 입력 | UGC 모더레이션 운영 부담 | 검토 후 결정 |
| 평점순 정렬 | 소스별 점수 체계가 달라 단순 비교 불가 | 정규화 방안 수립 후 |
| 푸시 알림 | 모바일 앱 미지원 | PWA 전환 시 |
| 다국어 (영어·일어) | 초기 타겟은 국내 사용자 | v0.4 |
| Redis 캐싱 | MVP 트래픽에서 DB 직접 조회로 충분 | 트래픽 증가 시 |

---

## 품질 기준 (Done Criteria)

| 항목 | 기준 |
|------|------|
| 접근성 | WCAG AA — 터치 타겟 44px 이상, 포커스 트랩, ESC 닫기 |
| 보안 | XSS 방어 (HTML escape), API 키 서버 격리, rate limiting |
| 성능 | Largest Contentful Paint ≤ 2.5s (4G 기준) |
| 타입 안전성 | TypeScript strict, 빌드 오류 0 |
| 크롤러 | 수집 성공률 ≥ 95%, crawl_logs 테이블에 결과 기록 |

---

## 마일스톤

| 단계 | 내용 | 상태 |
|------|------|------|
| M1 | 프론트엔드 UI + Mock 모드 | ✅ 완료 |
| M2 | 백엔드 API (PostGIS 반경 검색, cursor 페이지네이션) | ✅ 코드 완료 (DB 연결 필요) |
| M3 | 미슐랭 크롤러 + GitHub Actions | ✅ 코드 완료 (운영 환경 배포 필요) |
| M4 | 프론트엔드 → 실 백엔드 연동 | 대기 중 |
| M5 | 블루리본·식신 크롤러 | v0.2 예정 |
