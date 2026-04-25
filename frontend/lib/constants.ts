export const RADIUS_OPTIONS = [
  { label: '500m', value: 500 },
  { label: '1km', value: 1000 },
  { label: '3km', value: 3000 },
  { label: '5km', value: 5000 },
] as const;

export const CATEGORY_OPTIONS = [
  '전체', '한식', '일식', '중식', '양식', '아시안', '카페·디저트', '기타',
] as const;

export const SOURCE_OPTIONS = [
  { label: '블루리본', value: 'blueribbon' },
  { label: '미슐랭', value: 'michelin' },
  { label: '식신', value: 'sikshin' },
] as const;

export const SORT_OPTIONS = [
  { label: '거리순', value: 'distance' },
  { label: '평점순', value: 'rating' },
] as const;

export const RATING_OPTIONS = [
  { label: '9.0 이상', value: 9.0 },
  { label: '8.5 이상', value: 8.5 },
  { label: '8.0 이상', value: 8.0 },
] as const;

export const DEFAULT_LOCATION = { lat: 37.5665, lng: 126.978 }; // 서울 시청

export const DEFAULT_ZOOM_BY_RADIUS: Record<number, number> = {
  500: 4,
  1000: 5,
  3000: 6,
  5000: 7,
};

export const API_BASE_URL = '';

export const PAGE_LIMIT = 20;
