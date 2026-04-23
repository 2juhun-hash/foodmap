import { useEffect, useRef, useCallback } from 'react';
import type { Restaurant } from '../types';

declare global {
  interface Window {
    kakao: any;
    __kakaoLoadFailed?: boolean;
  }
}

interface UseKakaoMapOptions {
  center?: { lat: number; lng: number };
  onMarkerClick?: (restaurant: Restaurant) => void;
}

export function useKakaoMap(
  containerId: string,
  restaurants: (Restaurant & { distance?: number })[],
  options: UseKakaoMapOptions = {}
) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const isReadyRef = useRef(false);

  const initMap = useCallback(() => {
    if (!window.kakao?.maps || window.__kakaoLoadFailed) return false;
    const container = document.getElementById(containerId);
    if (!container) return false;

    const kakao = window.kakao;
    const center = options.center
      ? new kakao.maps.LatLng(options.center.lat, options.center.lng)
      : new kakao.maps.LatLng(37.5665, 126.9780);

    mapRef.current = new kakao.maps.Map(container, {
      center,
      level: 5,
    });
    isReadyRef.current = true;
    return true;
  }, [containerId, options.center]);

  useEffect(() => {
    const tryInit = () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => initMap());
      }
    };
    tryInit();
    const t = setTimeout(tryInit, 1000);
    return () => clearTimeout(t);
  }, [initMap]);

  // 식당 마커 업데이트
  useEffect(() => {
    if (!isReadyRef.current || !mapRef.current) return;
    const kakao = window.kakao;
    if (!kakao?.maps) return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    restaurants.forEach(r => {
      const pos = new kakao.maps.LatLng(r.location.lat, r.location.lng);
      const marker = new kakao.maps.Marker({ position: pos, map: mapRef.current });

      const infoContent = `
        <div style="padding:8px 12px;font-size:13px;font-weight:600;white-space:nowrap;
          background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
          ${r.name} ★${r.averageRating}
        </div>`;
      const infoWindow = new kakao.maps.InfoWindow({ content: infoContent, removable: false });

      kakao.maps.event.addListener(marker, 'click', () => {
        infoWindow.open(mapRef.current, marker);
        options.onMarkerClick?.(r);
      });
      markersRef.current.push(marker);
    });
  }, [restaurants, options.onMarkerClick]);

  const moveToLocation = useCallback((lat: number, lng: number) => {
    if (!mapRef.current || !window.kakao?.maps) return;
    const kakao = window.kakao;
    const pos = new kakao.maps.LatLng(lat, lng);
    mapRef.current.setCenter(pos);
    mapRef.current.setLevel(4);

    if (userMarkerRef.current) userMarkerRef.current.setMap(null);

    const imageSrc = '';
    void imageSrc;
    const circle = new kakao.maps.Circle({
      center: pos,
      radius: 12,
      strokeWeight: 3,
      strokeColor: '#fff',
      strokeOpacity: 1,
      fillColor: '#4A90E2',
      fillOpacity: 1,
    });
    circle.setMap(mapRef.current);
    userMarkerRef.current = circle;
  }, []);

  const isKakaoAvailable = !!(window.kakao?.maps || (!window.__kakaoLoadFailed));

  return { mapRef, moveToLocation, isKakaoAvailable };
}

export function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    if (!window.kakao?.maps?.services) { resolve(null); return; }
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(address, (result: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result[0]) {
        resolve({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) });
      } else {
        resolve(null);
      }
    });
  });
}
