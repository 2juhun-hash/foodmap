import { useStore } from '../store/useStore';
import RestaurantCard from './RestaurantCard';
import { MapPin } from 'lucide-react';

export default function RestaurantList() {
  const { getFilteredRestaurants, userLocation, setUserLocation, setLocationLoading } = useStore();
  const list = getFilteredRestaurants();

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      () => setLocationLoading(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="px-4 py-5 pb-24 lg:pb-6">
      {/* 결과 수 */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          <span className="font-bold text-primary text-base">{list.length}</span>
          <span className="ml-1">개 식당</span>
          {!userLocation && (
            <span className="text-gray-400 ml-2 text-xs hidden sm:inline">
              내 위치 설정 시 거리 표시
            </span>
          )}
        </p>
        {userLocation && (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <MapPin className="w-3 h-3" /> 현재 위치 기준
          </span>
        )}
      </div>

      {list.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-6xl mb-4">🍽️</div>
          <p className="text-base font-semibold text-gray-500 mb-2">검색 결과가 없습니다</p>
          <p className="text-sm text-gray-400 mb-6">
            필터를 변경하거나 검색어를 수정해보세요.
          </p>
          {!userLocation && (
            <button
              onClick={handleGeolocate}
              className="inline-flex items-center gap-2 bg-accent text-primary px-6 py-3 rounded-full font-semibold hover:bg-yellow-400 transition active:scale-95"
            >
              <MapPin className="w-4 h-4" /> 내 주변 맛집 찾기
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map(restaurant => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      )}
    </div>
  );
}
