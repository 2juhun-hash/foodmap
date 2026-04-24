'use client';

import { useEffect, useRef } from 'react';
import type { Restaurant, GeoLocation } from '@/types';
import RestaurantCard from './RestaurantCard';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import EmptyState from '@/components/common/EmptyState';

interface Props {
  items: Restaurant[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  location: GeoLocation | null;
  isLocating: boolean;
  onSelect: (r: Restaurant) => void;
}

const isMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export default function RestaurantList({ items, loading, error, hasMore, loadMore, location, isLocating, onSelect }: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  // BUG-02: ref로 최신 loadMore를 유지해 observer가 재부착되지 않도록 함
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMoreRef.current(); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <EmptyState type="server-error" onAction={() => window.location.reload()} />;
  // BUG-07: 위치 감지 중에는 location-denied 표시 안 함
  if (!isMock && !location && !loading && !isLocating) return <EmptyState type="location-denied" onAction={() => window.location.reload()} />;
  if (!loading && items.length === 0) return <EmptyState type="no-results" />;

  return (
    <div>
      {items.map(r => (
        <RestaurantCard key={r.id} restaurant={r} onClick={() => onSelect(r)} />
      ))}
      {loading && <LoadingSkeleton count={3} />}
      <div ref={sentinelRef} className="h-4" aria-hidden="true" />
    </div>
  );
}
