import { useStore } from '../store/useStore';
import type { Category, Source, SortType } from '../types';

const CATEGORIES: Category[] = ['전체', '한식', '중식', '일식', '양식', '아시안', '카페·디저트', '기타'];
const SOURCES: { key: Source; label: string; color: string }[] = [
  { key: 'michelin', label: '미슐랭', color: 'bg-red-600 text-white' },
  { key: 'blueribbon', label: '블루리본', color: 'bg-blue-600 text-white' },
  { key: 'sikshin', label: '식신', color: 'bg-orange-500 text-white' },
];
const SORT_OPTIONS: { key: SortType; label: string }[] = [
  { key: 'rating', label: '평점 높은 순' },
  { key: 'distance', label: '거리 가까운 순' },
  { key: 'reviews', label: '리뷰 많은 순' },
];
const RADIUS_OPTIONS = [500, 1000, 2000, 5000];

export default function FilterBar() {
  const { filters, setCategory, toggleSource, setSortBy, setRadius } = useStore();

  return (
    <div className="bg-white border-b border-gray-200 sticky top-[57px] z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        {/* 카테고리 탭 */}
        <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition
                ${filters.category === cat
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 하단 필터 */}
        <div className="flex flex-wrap items-center gap-4 py-2 pb-3 border-t border-gray-100">
          {/* 출처 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">출처:</span>
            {SOURCES.map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => toggleSource(key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition border-2
                  ${filters.sources.includes(key)
                    ? `${color} border-transparent`
                    : 'bg-white text-gray-400 border-gray-200'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 정렬 */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500 font-medium">정렬:</span>
            <select
              value={filters.sortBy}
              onChange={e => setSortBy(e.target.value as SortType)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-accent bg-white"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>

            {/* 반경 */}
            <span className="text-xs text-gray-500 font-medium">반경:</span>
            <select
              value={filters.radius}
              onChange={e => setRadius(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-accent bg-white"
            >
              {RADIUS_OPTIONS.map(r => (
                <option key={r} value={r}>{r >= 1000 ? `${r / 1000}km` : `${r}m`}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
