import axios from 'axios';
import type { Restaurant, RestaurantsResponse, FilterState } from '@/types';
import { API_BASE_URL, PAGE_LIMIT } from './constants';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

client.interceptors.response.use(
  res => res,
  err => {
    const message = err.response?.data?.detail ?? '서버 연결에 실패했습니다.';
    return Promise.reject(new Error(message));
  },
);

// API 응답 → 프론트 타입 변환 (source → source_type, 누락 필드 기본값)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeRestaurant(r: any): Restaurant {
  return {
    ...r,
    id: String(r.id),
    location: r.location ?? { lat: r.lat, lng: r.lng },
    images: r.images ?? [],
    signature_dishes: r.signature_dishes ?? [],
    sources: (r.sources ?? []).map((s: any) => {
      const raw = s.source_type ?? s.source ?? '';
      // DB 오타 보정: blueribon → blueribbon
      const source_type = raw === 'blueribon' ? 'blueribbon' : raw;
      return { ...s, source_type };
    }),
  };
}

export async function fetchRestaurants(
  filter: FilterState,
  cursor?: string,
): Promise<RestaurantsResponse> {
  if (!filter.location) throw new Error('위치 정보가 없습니다.');

  const params: Record<string, unknown> = {
    lat: filter.location.lat,
    lng: filter.location.lng,
    radius: filter.radius,
    sort: filter.sortBy,
    limit: PAGE_LIMIT,
  };
  if (filter.category !== '전체') params.category = filter.category;
  if (filter.sources.length > 0) params.sources = filter.sources.join(',');
  if (filter.minRating) params.min_rating = filter.minRating;
  if (cursor) params.cursor = cursor;

  const { data } = await client.get('/api/v1/restaurants', { params });
  return {
    ...data,
    items: (data.items ?? []).map(normalizeRestaurant),
  };
}

export async function fetchRestaurantById(id: string): Promise<Restaurant> {
  const { data } = await client.get<{ restaurant: Restaurant }>(`/api/v1/restaurants/${id}`);
  return data.restaurant;
}

export async function searchRestaurants(
  query: string,
  filter: FilterState,
): Promise<RestaurantsResponse> {
  const params: Record<string, unknown> = { query, limit: PAGE_LIMIT };
  if (filter.location) {
    params.lat = filter.location.lat;
    params.lng = filter.location.lng;
  }
  const { data } = await client.get<RestaurantsResponse>('/api/v1/restaurants/search', { params });
  return data;
}
