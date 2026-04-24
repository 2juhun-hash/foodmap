'use client';

import { useState, useRef, useEffect } from 'react';
import { MapPin, Loader2, Search, X } from 'lucide-react';
import { useFilterStore } from '@/store/filterStore';
import { useGeolocation } from '@/hooks/useGeolocation';

const RECENT_KEY = 'foodmap-recent-searches';
const MAX_RECENT = 5;

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}
function saveRecent(query: string) {
  const list = [query, ...getRecent().filter(q => q !== query)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

export default function Header() {
  const { setLocation, setIsLocating } = useFilterStore();
  const { location, loading: geoLoading, error: geoError, detect } = useGeolocation();

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { detect(); }, [detect]);
  useEffect(() => { if (location) setLocation(location); }, [location, setLocation]);
  // BUG-07: geoLoading이 false가 되면 위치 감지 완료 (성공/실패 모두)
  useEffect(() => { if (!geoLoading) setIsLocating(false); }, [geoLoading, setIsLocating]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    setFocused(false);
    try {
      const res = await fetch(`/api/geocode?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error((await res.json()).error ?? '검색 실패');
      const data = await res.json();
      setLocation({ lat: data.lat, lng: data.lng });
      setQuery(data.place_name ?? searchQuery);
      saveRecent(searchQuery);
      setRecent(getRecent());
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : '위치 검색에 실패했습니다.');
    } finally {
      setSearching(false);
    }
  };

  const handleFocus = () => {
    setRecent(getRecent());
    setFocused(true);
  };

  return (
    <header className="bg-white border-b border-divider px-4 h-14 flex items-center gap-2 sticky top-0 z-30">
      {/* 로고 */}
      <span className="text-primary font-bold text-lg tracking-tight flex-shrink-0">🍴 FoodMap</span>

      {/* 검색바 */}
      <div className="relative flex-1 max-w-sm">
        <div className={`flex items-center h-9 rounded-lg border bg-surface-alt px-2 gap-1 transition-colors ${focused ? 'border-primary' : 'border-divider'}`}>
          {searching
            ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" aria-hidden="true" />
            : <Search className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
          }
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={handleFocus}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={e => e.key === 'Enter' && handleSearch(query)}
            placeholder="지역, 동네 검색"
            aria-label="지역명 검색"
            aria-autocomplete="list"
            aria-expanded={focused && recent.length > 0}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 min-w-0"
          />
          {query && (
            <button onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="검색어 지우기" className="flex-shrink-0">
              <X className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* 최근 검색어 드롭다운 */}
        {focused && recent.length > 0 && (
          <ul
            role="listbox"
            aria-label="최근 검색어"
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-divider rounded-lg shadow-md overflow-hidden z-50"
          >
            {recent.map(q => (
              <li key={q}>
                <button
                  role="option"
                  aria-selected={false}
                  onMouseDown={() => { setQuery(q); handleSearch(q); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
                >
                  <Search className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" aria-hidden="true" />
                  {q}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* 검색 에러 */}
        {searchError && (
          <p role="alert" className="absolute top-full left-0 mt-1 text-xs text-red-500 px-1">{searchError}</p>
        )}
      </div>

      {/* 위치 감지 버튼 */}
      <button
        onClick={detect}
        disabled={geoLoading}
        aria-label="현재 위치 자동 감지"
        className="flex-shrink-0 flex items-center gap-1 text-sm text-gray-600 hover:text-primary transition-colors disabled:opacity-50"
      >
        {geoLoading
          ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          : <MapPin className="w-4 h-4" aria-hidden="true" />
        }
        <span className="hidden sm:inline">{geoError ? '위치 오류' : '현재위치'}</span>
      </button>
    </header>
  );
}
