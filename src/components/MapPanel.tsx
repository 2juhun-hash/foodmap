import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useKakaoMap } from '../hooks/useKakaoMap';
import type { Restaurant } from '../types';

export default function MapPanel() {
  const { getFilteredRestaurants, userLocation, setSelectedRestaurant } = useStore();
  const restaurants = getFilteredRestaurants();

  const { moveToLocation, isKakaoAvailable } = useKakaoMap(
    'kakao-map-container',
    restaurants,
    { onMarkerClick: (r: Restaurant) => setSelectedRestaurant(r) }
  );

  useEffect(() => {
    if (userLocation) {
      moveToLocation(userLocation.lat, userLocation.lng);
    }
  }, [userLocation, moveToLocation]);

  if (!isKakaoAvailable) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-500 gap-3 p-6 text-center">
        <span className="text-5xl">🗺️</span>
        <p className="font-semibold text-gray-700">지도를 불러올 수 없습니다</p>
        <p className="text-sm leading-relaxed">
          카카오 API 키 설정 후 지도가 표시됩니다.<br />
          지금은 목록 탭에서 맛집을 확인하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div id="kakao-map-container" className="w-full h-full" />
      <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-md px-3 py-2 text-xs text-gray-600">
        식당 마커를 탭하면 상세 정보를 볼 수 있어요
      </div>
    </div>
  );
}
