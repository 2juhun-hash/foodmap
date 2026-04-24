'use client';

import { useState, useCallback } from 'react';
import type { GeoLocation } from '@/types';

interface GeolocationState {
  location: GeoLocation | null;
  error: string | null;
  loading: boolean;
  detect: () => void;
}

export function useGeolocation(): GeolocationState {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const detect = useCallback(() => {
    if (!navigator.geolocation) {
      setError('이 브라우저는 위치 서비스를 지원하지 않습니다.');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      err => {
        const messages: Record<number, string> = {
          1: '위치 권한이 거부되었습니다. 설정에서 허용해주세요.',
          2: '위치 정보를 가져올 수 없습니다.',
          3: '위치 요청 시간이 초과되었습니다.',
        };
        setError(messages[err.code] ?? '위치를 가져오는 중 오류가 발생했습니다.');
        // 위치 권한 거부 시 서울 시청 기본 좌표로 fallback
        setLocation({ lat: 37.5665, lng: 126.9780 });
        setLoading(false);
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  return { location, error, loading, detect };
}
