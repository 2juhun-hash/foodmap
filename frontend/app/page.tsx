'use client';

import { useState } from 'react';
import { List, Map } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import Header from '@/components/layout/Header';
import FilterBar from '@/components/filter/FilterBar';
import RestaurantList from '@/components/restaurant/RestaurantList';
import RestaurantDetail from '@/components/restaurant/RestaurantDetail';
import EmptyState from '@/components/common/EmptyState';
import type { Restaurant } from '@/types';
import dynamic from 'next/dynamic';
import { useFilterStore } from '@/store/filterStore';
import { useRestaurants } from '@/hooks/useRestaurants';

const KakaoMap = dynamic(() => import('@/components/map/KakaoMap'), { ssr: false });

export default function HomePage() {
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [mobileTab, setMobileTab] = useState<'list' | 'map'>('list');

  // PERF-01: shallow selector로 불필요한 리렌더 방지
  const filter = useFilterStore(
    useShallow(s => ({
      location: s.location,
      category: s.category,
      sources: s.sources,
      sortBy: s.sortBy,
      radius: s.radius,
      searchQuery: s.searchQuery,
      minRating: s.minRating,
    }))
  );
  const isLocating = useFilterStore(s => s.isLocating);
  const { items, loading, error, hasMore, loadMore } = useRestaurants(filter);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <FilterBar />

      <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100dvh - 114px)' }}>
        {/* 목록 패널 */}
        <div className={`overflow-y-auto w-full lg:w-[480px] lg:flex-none lg:block xl:w-[560px] ${mobileTab === 'list' ? 'block' : 'hidden lg:block'}`}>
          <RestaurantList
            items={items}
            loading={loading}
            error={error}
            hasMore={hasMore}
            loadMore={loadMore}
            location={filter.location}
            isLocating={isLocating}
            onSelect={setSelected}
          />
        </div>

        {/* 지도 패널 */}
        <div className={`flex-1 ${mobileTab === 'map' ? 'block' : 'hidden lg:block'}`}>
          {filter.location ? (
            <KakaoMap
              restaurants={items}
              location={filter.location}
              radius={filter.radius}
              onSelect={setSelected}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <EmptyState type="location-denied" />
            </div>
          )}
        </div>
      </div>

      {/* 모바일 탭바 */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-divider flex z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="메인 내비게이션"
      >
        <button
          onClick={() => setMobileTab('list')}
          aria-pressed={mobileTab === 'list'}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${mobileTab === 'list' ? 'text-primary' : 'text-gray-400'}`}
        >
          <List className="w-5 h-5" aria-hidden="true" />
          목록
        </button>
        <button
          onClick={() => setMobileTab('map')}
          aria-pressed={mobileTab === 'map'}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${mobileTab === 'map' ? 'text-primary' : 'text-gray-400'}`}
        >
          <Map className="w-5 h-5" aria-hidden="true" />
          지도
        </button>
      </nav>

      {/* 상세 패널 */}
      {selected && <RestaurantDetail restaurant={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
