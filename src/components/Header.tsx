import { useState, useRef } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { geocodeAddress } from '../hooks/useKakaoMap';

export default function Header() {
  const {
    filters, setSearchQuery,
    userLocation, setUserLocation,
    setLocationLoading, locationLoading,
  } = useStore();

  const [inputValue, setInputValue] = useState(filters.searchQuery);
  const [geocoding, setGeocoding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert('이 브라우저는 위치 서비스를 지원하지 않습니다.');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      () => {
        alert('위치를 가져올 수 없습니다.\n브라우저 위치 권한을 확인해주세요.\n(HTTPS 환경에서만 작동합니다)');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSearch = async (value: string) => {
    setInputValue(value);
    setSearchQuery(value);

    // 한글 지역명 검색 시 지오코딩 시도
    if (value.length >= 2 && /[가-힣]/.test(value)) {
      setGeocoding(true);
      const coords = await geocodeAddress(value);
      setGeocoding(false);
      if (coords) {
        setUserLocation(coords);
      }
    }
  };

  const clearSearch = () => {
    setInputValue('');
    setSearchQuery('');
    inputRef.current?.focus();
  };

  return (
    <header className="bg-primary text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        {/* 로고 */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-primary font-black text-sm">F</span>
          </div>
          <div className="hidden sm:block">
            <span className="text-accent font-black text-xl tracking-tight">FoodMap</span>
            <span className="text-gray-400 text-xs ml-2">미슐랭·블루리본·식신</span>
          </div>
          <span className="sm:hidden text-accent font-black text-xl">FoodMap</span>
        </div>

        {/* 검색창 */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          {geocoding && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />
          )}
          {inputValue && !geocoding && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            placeholder="지역명, 식당명, 음식 종류..."
            value={inputValue}
            onChange={e => handleSearch(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-full pl-10 pr-9 py-2.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-accent transition"
          />
        </div>

        {/* 내 위치 버튼 */}
        <button
          onClick={handleGeolocate}
          disabled={locationLoading}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-full text-sm font-semibold transition flex-shrink-0 active:scale-95
            ${userLocation
              ? 'bg-green-500 text-white'
              : 'bg-accent text-primary hover:bg-yellow-400'
            }`}
        >
          {locationLoading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <MapPin className="w-4 h-4" />
          }
          <span className="hidden sm:inline">
            {locationLoading ? '위치 찾는 중...' : userLocation ? '위치 확인됨' : '내 위치'}
          </span>
        </button>
      </div>
    </header>
  );
}
