'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Phone, MapPin, X } from 'lucide-react';
import type { Restaurant } from '@/types';
import SourceBadge from '@/components/common/SourceBadge';
import BusinessHours from './BusinessHours';

interface Props {
  restaurant: Restaurant;
  onClose: () => void;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input,textarea,[tabindex]:not([tabindex="-1"])';

export default function RestaurantDetail({ restaurant: r, onClose }: Props) {
  const [imgIndex, setImgIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const focusables = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (!focusables.length) return;
      if (e.shiftKey) {
        if (document.activeElement === focusables[0]) { e.preventDefault(); focusables[focusables.length - 1].focus(); }
      } else {
        if (document.activeElement === focusables[focusables.length - 1]) { e.preventDefault(); focusables[0].focus(); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); prevFocus?.focus(); };
  }, [onClose]);

  // R-03 CODE-02: 좌표 직접 전달로 정확한 길찾기
  const kakaoMapUrl = `https://map.kakao.com/link/map/${encodeURIComponent(r.name)},${r.location.lat},${r.location.lng}`;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="detail-title" className="fixed inset-0 z-50 flex items-end lg:items-stretch">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div ref={panelRef} className="relative bg-white w-full max-h-[90dvh] lg:w-[560px] lg:max-h-full lg:ml-auto overflow-y-auto rounded-t-2xl lg:rounded-none shadow-xl">
        <button onClick={onClose} aria-label="상세 닫기" className="absolute top-4 right-4 z-10 bg-white rounded-full p-1.5 shadow-md min-w-[44px] min-h-[44px] flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>

        <div className="lg:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" aria-hidden="true" />
        </div>

        {/* 이미지 갤러리 */}
        <div className="relative aspect-video bg-gray-100">
          {r.images[imgIndex] && (
            <Image src={r.images[imgIndex]} alt={`${r.name} 이미지 ${imgIndex + 1}`} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 560px" />
          )}
          {r.images.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
              {r.images.map((_, i) => (
                <button key={i} onClick={() => setImgIndex(i)} aria-label={`이미지 ${i + 1}`}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIndex ? 'bg-white' : 'bg-white/50'}`} />
              ))}
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className="flex flex-wrap gap-1 mb-2">
              {r.sources.map(s => <SourceBadge key={s.source_type} source={s} />)}
            </div>
            <h2 id="detail-title" className="text-2xl font-bold text-gray-900">{r.name}</h2>
            <p className="text-sm text-gray-500 mt-1">{r.category} · {r.address.split(' ').slice(0, 2).join(' ')}</p>
          </div>

          <div className="border-t border-divider pt-4">
            <BusinessHours hours={r.hours} />
          </div>

          {/* R-08: text-sm(14px) 이상 */}
          {r.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-gray-400" aria-hidden="true" />
              <span className="text-gray-700">{r.phone}</span>
            </div>
          )}

          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span className="text-gray-700">{r.address}</span>
          </div>

          {r.signature_dishes.length > 0 && (
            <div className="border-t border-divider pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">대표 메뉴</h3>
              <ul className="space-y-1">
                {r.signature_dishes.map((d, i) => (
                  <li key={i} className="flex justify-between text-sm text-gray-600">
                    <span>{d.name}</span>
                    {d.price && <span className="text-gray-400">{d.price}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA — 전화하기는 본문 중복 제거하고 CTA만 유지 (R-03 CODE-03) */}
          <div className="flex gap-3 pt-2">
            {r.phone && (
              <a href={`tel:${r.phone}`}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors min-h-[44px]"
                aria-label={`${r.name}에 전화하기`}>
                <Phone className="w-4 h-4" aria-hidden="true" />전화하기
              </a>
            )}
            <a href={kakaoMapUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 border border-primary text-primary py-3 rounded-xl text-sm font-medium hover:bg-primary-light transition-colors min-h-[44px]"
              aria-label={`${r.name} 길찾기`}>
              <MapPin className="w-4 h-4" aria-hidden="true" />길찾기
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
