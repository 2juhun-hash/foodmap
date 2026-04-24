'use client';

import Image from 'next/image';
import type { Restaurant } from '@/types';
import SourceBadge from '@/components/common/SourceBadge';
import { formatDistance } from '@/lib/distance';
import { getBusinessStatus, STATUS_LABEL } from '@/lib/businessHours';

interface Props {
  restaurant: Restaurant;
  onClick: () => void;
  priority?: boolean;
}

export default function RestaurantCard({ restaurant: r, onClick, priority = false }: Props) {
  const status = getBusinessStatus(r.hours);
  const thumbnail = r.images?.[0] ?? r.thumbnail_url ?? '/placeholder.png';

  return (
    <article
      aria-label={`${r.name}, ${r.category}${r.distance_m !== undefined ? `, ${formatDistance(r.distance_m)}` : ''}`}
      onClick={onClick}
      // R-08: Space 키도 활성화 (WCAG 2.1.1)
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
      tabIndex={0}
      className="flex gap-3 p-4 border-b border-divider cursor-pointer hover:bg-gray-50 active:scale-[0.99] transition-all focus-visible:outline-2 focus-visible:outline-primary"
    >
      {/* 썸네일 */}
      <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
        <Image
          src={thumbnail}
          alt={`${r.name} 외관`}
          fill
          priority={priority}
          className={`object-cover ${status === 'closed' ? 'brightness-50' : ''}`}
          sizes="96px"
        />
        {status === 'closed' && (
          <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
            영업종료
          </span>
        )}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-1 mb-1">
          {r.sources.map(s => <SourceBadge key={s.source_type} source={s} size="sm" />)}
        </div>

        {/* R-08: text-sm(14px) 이상 적용 */}
        <h3 className="text-base font-bold text-gray-900 truncate">{r.name}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{r.category}</p>

        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
          {r.distance_m !== undefined && <span>{formatDistance(r.distance_m)}</span>}
          <span className={status === 'open' ? 'text-green-600' : 'text-gray-400'}>
            ● {STATUS_LABEL[status]}
          </span>
        </div>

        {r.signature_dishes.length > 0 && (
          <p className="text-sm text-gray-400 mt-1 truncate">
            {r.signature_dishes.slice(0, 2).map(d => d.name).join(', ')}
          </p>
        )}
      </div>
    </article>
  );
}
