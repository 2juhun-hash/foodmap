import { useState } from 'react';
import { List, Map } from 'lucide-react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import RestaurantList from './components/RestaurantList';
import RestaurantDetail from './components/RestaurantDetail';
import MapPanel from './components/MapPanel';
import { useStore } from './store/useStore';

export default function App() {
  const selectedRestaurant = useStore(s => s.selectedRestaurant);
  const [mobileTab, setMobileTab] = useState<'list' | 'map'>('list');

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />
      <FilterBar />

      {/* 데스크톱: 좌우 분할 / 모바일: 탭 전환 */}
      <div className="flex-1 flex overflow-hidden">

        {/* 목록 패널 */}
        <div className={`
          flex-1 overflow-y-auto
          lg:flex-none lg:w-[480px] lg:block xl:w-[560px]
          ${mobileTab === 'list' ? 'block' : 'hidden lg:block'}
        `}>
          <RestaurantList />
        </div>

        {/* 지도 패널 (데스크톱 항상 표시 / 모바일 탭 전환) */}
        <div className={`
          flex-1
          lg:block
          ${mobileTab === 'map' ? 'block' : 'hidden lg:block'}
        `}
          style={{ height: 'calc(100vh - 116px)' }}
        >
          <MapPanel />
        </div>
      </div>

      {/* 모바일 하단 탭바 */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 flex safe-area-inset-bottom"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition
            ${mobileTab === 'list' ? 'text-primary' : 'text-gray-400'}`}
        >
          <List className={`w-5 h-5 ${mobileTab === 'list' ? 'text-accent' : ''}`} />
          목록
        </button>
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition
            ${mobileTab === 'map' ? 'text-primary' : 'text-gray-400'}`}
        >
          <Map className={`w-5 h-5 ${mobileTab === 'map' ? 'text-accent' : ''}`} />
          지도
        </button>
      </nav>

      {/* 상세 모달 */}
      {selectedRestaurant && <RestaurantDetail />}
    </div>
  );
}
