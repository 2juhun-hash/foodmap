'use client';

import { useEffect, useRef } from 'react';
import type { Restaurant, GeoLocation } from '@/types';
import { DEFAULT_ZOOM_BY_RADIUS } from '@/lib/constants';

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (cb: () => void) => void;
        Map: new (el: HTMLElement, opts: object) => KakaoMap;
        LatLng: new (lat: number, lng: number) => object;
        Marker: new (opts: object) => KakaoMarker;
        InfoWindow: new (opts: object) => KakaoInfoWindow;
        event: { addListener: (target: object, type: string, cb: () => void) => void };
      };
    };
  }
  interface KakaoMap { setCenter: (latlng: object) => void; setLevel: (level: number) => void; }
  interface KakaoMarker { setMap: (map: object | null) => void; }
  interface KakaoInfoWindow { open: (map: object, marker: object) => void; close: () => void; }
}

interface Props {
  restaurants: Restaurant[];
  location: GeoLocation | null;
  radius: number;
  onSelect: (r: Restaurant) => void;
}

const JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

export default function KakaoMap({ restaurants, location, radius, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !location || !JS_KEY) return;

    const init = () => {
      if (!window.kakao?.maps) return;
      window.kakao.maps.load(() => {
        const center = new window.kakao.maps.LatLng(location.lat, location.lng);
        const map = new window.kakao.maps.Map(containerRef.current!, {
          center,
          level: DEFAULT_ZOOM_BY_RADIUS[radius] ?? 5,
        });

        new window.kakao.maps.Marker({ map, position: center });

        restaurants.forEach(r => {
          const pos = new window.kakao.maps.LatLng(r.location.lat, r.location.lng);
          const marker = new window.kakao.maps.Marker({ map, position: pos });
          const safeName = r.name.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
          const infoWindow = new window.kakao.maps.InfoWindow({
            content: `<div style="padding:6px 10px;font-size:13px;font-weight:600">${safeName}</div>`,
          });
          window.kakao.maps.event.addListener(marker, 'click', () => {
            infoWindow.open(map, marker);
            onSelect(r);
          });
        });
      });
    };

    const existing = document.getElementById('kakao-map-sdk');
    if (!existing) {
      const s = document.createElement('script');
      s.id = 'kakao-map-sdk';
      s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${JS_KEY}&autoload=false`;
      s.referrerPolicy = 'no-referrer';
      s.onload = init;
      document.head.appendChild(s);
    } else if (window.kakao?.maps) {
      init();
    } else {
      existing.addEventListener('load', init);
    }
  }, [location, radius, restaurants, onSelect]);

  if (!JS_KEY) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-sm">
        <p className="text-red-500 font-medium">NEXT_PUBLIC_KAKAO_JS_KEY 없음</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
        role="application"
        aria-label="맛집 지도"
      />
    </div>
  );
}
