'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Restaurant, FilterState } from '@/types';
import { fetchRestaurants } from '@/lib/api';
import mockData from '@/data/mock.json';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

interface UseRestaurantsResult {
  items: Restaurant[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

export function useRestaurants(filter: FilterState): UseRestaurantsResult {
  const [items, setItems] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // R-02: cursor를 useRef로 관리해 stale closure 제거
  const cursorRef = useRef<string | undefined>(undefined);
  const loadingRef = useRef(false);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const load = useCallback(async (reset: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      if (USE_MOCK) {
        await new Promise(r => setTimeout(r, 400));
        const f = filterRef.current;
        const filtered = (mockData.items as Restaurant[]).filter(r => {
          if (f.category !== '전체' && r.category !== f.category) return false;
          if (f.sources.length > 0 && !r.sources.some(s => f.sources.includes(s.source_type))) return false;
          if (f.radius && r.distance_m !== undefined && r.distance_m > f.radius) return false;
          return true;
        });
        const sorted = [...filtered].sort((a, b) =>
          f.sortBy === 'distance'
            ? (a.distance_m ?? 0) - (b.distance_m ?? 0)
            : 0,
        );
        setItems(sorted);
        setHasMore(false);
        cursorRef.current = undefined;
        return;
      }

      if (!filterRef.current.location) return;
      const res = await fetchRestaurants(
        filterRef.current,
        reset ? undefined : cursorRef.current,
      );
      setItems(prev => (reset ? res.items : [...prev, ...res.items]));
      cursorRef.current = res.next_cursor ?? undefined;
      setHasMore(res.next_cursor !== null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cursorRef.current = undefined;
    setItems([]);
    load(true);
  // filter 각 필드를 primitive로 구독해 불필요한 재실행 방지 (R-03 BUG-06)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filter.location?.lat,
    filter.location?.lng,
    filter.category,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(filter.sources),
    filter.radius,
    filter.sortBy,
    filter.minRating,
  ]);

  const loadMore = useCallback(() => {
    if (!loadingRef.current && hasMore) load(false);
  }, [hasMore, load]);

  const refresh = useCallback(() => {
    cursorRef.current = undefined;
    load(true);
  }, [load]);

  return { items, loading, error, hasMore, loadMore, refresh };
}
