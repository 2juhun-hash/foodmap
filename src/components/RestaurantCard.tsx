import { Star, MapPin, Clock } from 'lucide-react';
import type { Restaurant } from '../types';
import { isCurrentlyOpen, formatDistance } from '../utils/distance';
import RatingBadge from './RatingBadge';
import { useStore } from '../store/useStore';

interface Props {
  restaurant: Restaurant & { distance?: number };
}

export default function RestaurantCard({ restaurant }: Props) {
  const setSelectedRestaurant = useStore(s => s.setSelectedRestaurant);
  const open = isCurrentlyOpen(restaurant.hours as Record<string, string | undefined>);

  return (
    <div
      onClick={() => setSelectedRestaurant(restaurant)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5 border border-gray-100"
    >
      {/* 이미지 */}
      <div className="relative h-48 bg-gray-200 overflow-hidden">
        <img
          src={restaurant.images[0]}
          alt={restaurant.name}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={e => {
            (e.target as HTMLImageElement).src = `https://via.placeholder.com/400x200/1A1A1A/E8B86D?text=${encodeURIComponent(restaurant.name)}`;
          }}
        />
        {/* 영업 여부 배지 */}
        <span
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold text-white shadow
            ${open ? 'bg-open' : 'bg-closed'}`}
        >
          {open ? '영업 중' : '영업 종료'}
        </span>
        {/* 카테고리 태그 */}
        <span className="absolute top-3 left-3 bg-black/60 text-white px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
          {restaurant.category}
        </span>
      </div>

      {/* 내용 */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-primary text-lg leading-tight">{restaurant.name}</h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Star className="w-4 h-4 fill-accent text-accent" />
            <span className="font-bold text-primary">{restaurant.averageRating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({restaurant.reviewCount.toLocaleString()})</span>
          </div>
        </div>

        <RatingBadge ratings={restaurant.ratings} />

        <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span className="truncate max-w-[140px]">{restaurant.address.split(' ').slice(0, 3).join(' ')}</span>
          </span>
          {restaurant.distance !== undefined && (
            <span className="flex items-center gap-1 text-accent font-medium flex-shrink-0">
              <Clock className="w-3 h-3" />
              {formatDistance(restaurant.distance)}
            </span>
          )}
        </div>

        {restaurant.signatureDishes.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700">대표 메뉴</span>
            {' · '}
            {restaurant.signatureDishes.slice(0, 2).map(d => d.name).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}
