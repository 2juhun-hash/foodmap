'use client';

import { useFilterStore } from '@/store/filterStore';
import { CATEGORY_OPTIONS, RADIUS_OPTIONS, SOURCE_OPTIONS, RATING_OPTIONS, SORT_OPTIONS } from '@/lib/constants';
import type { Category, SourceType, SortType } from '@/types';
import { cn } from '@/lib/utils';

// R-06: role="button" 사용 (checkbox/radio 오남용 제거)
// R-07: 최소 높이 44px 적용
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex-shrink-0 min-h-[44px] px-3 text-sm font-medium rounded-full border transition-colors',
        active
          ? 'bg-primary-light border-primary text-primary-dark'
          : 'bg-surface-alt border-divider text-gray-600 hover:bg-primary-light hover:border-primary',
      )}
    >
      {label}
    </button>
  );
}

export default function FilterBar() {
  const { category, sources, radius, minRating, sortBy, setCategory, toggleSource, setRadius, setMinRating, setSortBy } = useFilterStore();

  return (
    <div className="bg-white border-b border-divider py-2 space-y-2" role="group" aria-label="맛집 필터">
      {/* 카테고리 */}
      <div className="flex gap-2 overflow-x-auto px-4 scrollbar-none" role="radiogroup" aria-label="음식 종류">
        {CATEGORY_OPTIONS.map(cat => (
          <Chip key={cat} label={cat} active={category === cat} onClick={() => setCategory(cat as Category)} />
        ))}
      </div>

      {/* 거리 · 출처 · 평점 · 정렬 */}
      <div className="flex gap-2 overflow-x-auto px-4 scrollbar-none">
        {RADIUS_OPTIONS.map(opt => (
          <Chip key={opt.value} label={opt.label} active={radius === opt.value} onClick={() => setRadius(opt.value)} />
        ))}
        <div className="w-px bg-divider mx-1 self-stretch" aria-hidden="true" />
        {SOURCE_OPTIONS.map(opt => (
          <Chip key={opt.value} label={opt.label} active={sources.includes(opt.value as SourceType)} onClick={() => toggleSource(opt.value as SourceType)} />
        ))}
        <div className="w-px bg-divider mx-1 self-stretch" aria-hidden="true" />
        {RATING_OPTIONS.map(opt => (
          <Chip key={opt.value} label={opt.label} active={minRating === opt.value} onClick={() => setMinRating(minRating === opt.value ? null : opt.value)} />
        ))}
        <div className="w-px bg-divider mx-1 self-stretch" aria-hidden="true" />
        {/* R-03 F-MISS-02: 정렬 UI 추가 */}
        {SORT_OPTIONS.map(opt => (
          <Chip key={opt.value} label={opt.label} active={sortBy === opt.value} onClick={() => setSortBy(opt.value as SortType)} />
        ))}
      </div>
    </div>
  );
}
