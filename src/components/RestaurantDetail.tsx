import { X, Phone, MapPin, Clock, Star, ExternalLink } from 'lucide-react';
import { useStore } from '../store/useStore';
import { isCurrentlyOpen, getDayLabel, formatDistance } from '../utils/distance';
import RatingBadge from './RatingBadge';
import type { Restaurant } from '../types';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function RestaurantDetail() {
  const { selectedRestaurant, setSelectedRestaurant } = useStore();
  if (!selectedRestaurant) return null;

  const r = selectedRestaurant as Restaurant & { distance?: number };
  const open = isCurrentlyOpen(r.hours as Record<string, string | undefined>);
  const naverMapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(r.name + ' ' + r.address)}`;
  const kakaoMapUrl = `https://map.kakao.com/?q=${encodeURIComponent(r.name + ' ' + r.address)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 오버레이 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setSelectedRestaurant(null)}
      />

      {/* 패널 — 모바일: 바텀시트 / 데스크톱: 센터 모달 */}
      <div className="relative bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl animate-slide-up">

        {/* 드래그 핸들 (모바일) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* 헤더 이미지 */}
        <div className="relative h-52 bg-gray-200 overflow-hidden">
          <img
            src={r.images[0]}
            alt={r.name}
            className="w-full h-full object-cover"
            onError={e => {
              (e.target as HTMLImageElement).src =
                `https://via.placeholder.com/800x300/1A1A1A/E8B86D?text=${encodeURIComponent(r.name)}`;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <button
            onClick={() => setSelectedRestaurant(null)}
            className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-4 right-16">
            <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-2.5 py-0.5 rounded-full mb-1.5 inline-block">
              {r.category}
            </span>
            <h2 className="text-white text-xl font-bold leading-tight">{r.name}</h2>
          </div>
          <span className={`absolute bottom-4 right-4 px-3 py-1 rounded-full text-sm font-bold text-white shadow-lg
            ${open ? 'bg-green-500' : 'bg-red-500'}`}>
            {open ? '영업 중' : '영업 종료'}
          </span>
        </div>

        <div className="p-5 space-y-5" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>

          {/* 평점 + 거리 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-accent text-accent" />
              <span className="text-2xl font-black text-primary">{r.averageRating.toFixed(1)}</span>
              <span className="text-gray-400 text-sm">/ 5.0</span>
              <span className="text-xs text-gray-400">({r.reviewCount.toLocaleString()}개)</span>
            </div>
            {r.distance !== undefined && (
              <span className="text-sm text-accent font-semibold">
                📍 {formatDistance(r.distance)}
              </span>
            )}
          </div>

          {/* 수상 뱃지 */}
          <RatingBadge ratings={r.ratings} size="md" />

          {/* 소개 */}
          {r.description && (
            <p className="text-sm text-gray-600 leading-relaxed border-l-4 border-accent pl-3 bg-accent/5 py-2 pr-3 rounded-r-lg">
              {r.description}
            </p>
          )}

          {/* 기본 정보 */}
          <div className="space-y-3">
            <h3 className="font-bold text-primary text-base">기본 정보</h3>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-700 mb-2">{r.address}</p>
                <div className="flex gap-2 flex-wrap">
                  <a href={kakaoMapUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs bg-yellow-400 text-black px-3 py-1.5 rounded-full font-semibold hover:bg-yellow-300 transition active:scale-95">
                    <ExternalLink className="w-3 h-3" /> 카카오맵
                  </a>
                  <a href={naverMapUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs bg-green-500 text-white px-3 py-1.5 rounded-full font-semibold hover:bg-green-400 transition active:scale-95">
                    <ExternalLink className="w-3 h-3" /> 네이버맵
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-accent flex-shrink-0" />
              <a href={`tel:${r.phone}`} className="text-sm text-blue-600 font-medium hover:underline flex-1">
                {r.phone}
              </a>
              <a href={`tel:${r.phone}`}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-full font-semibold hover:bg-blue-500 transition active:scale-95">
                전화 걸기
              </a>
            </div>
          </div>

          {/* 영업 시간 */}
          <div>
            <h3 className="font-bold text-primary text-base mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> 영업 시간
            </h3>
            <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
              {DAY_KEYS.map(day => {
                const val = (r.hours as Record<string, string | undefined>)[day];
                const todayIdx = new Date().getDay();
                const isToday = ['sun','mon','tue','wed','thu','fri','sat'][todayIdx] === day;
                return (
                  <div key={day}
                    className={`flex justify-between px-4 py-2.5 text-sm border-b border-gray-100 last:border-0
                      ${isToday ? 'bg-accent/10' : ''}`}>
                    <span className={`font-medium w-8 ${isToday ? 'text-primary' : 'text-gray-500'}`}>
                      {getDayLabel(day)}
                      {isToday && <span className="text-accent text-[10px] ml-1 align-top">오늘</span>}
                    </span>
                    <span className={`${!val || val === '휴무' ? 'text-red-500 font-medium' : 'text-gray-700'}`}>
                      {val ?? '정보 없음'}
                    </span>
                  </div>
                );
              })}
              {r.hours.breakTime && (
                <div className="px-4 py-2.5 text-xs text-orange-600 bg-orange-50 flex justify-between">
                  <span className="font-medium">브레이크타임</span>
                  <span>{r.hours.breakTime}</span>
                </div>
              )}
              {r.hours.holiday && (
                <div className="px-4 py-2.5 text-xs text-red-500 bg-red-50 flex justify-between">
                  <span className="font-medium">정기 휴무</span>
                  <span>{r.hours.holiday}</span>
                </div>
              )}
            </div>
          </div>

          {/* 대표 메뉴 */}
          {r.signatureDishes.length > 0 && (
            <div>
              <h3 className="font-bold text-primary text-base mb-3">대표 메뉴</h3>
              <div className="space-y-2">
                {r.signatureDishes.map((dish, i) => (
                  <div key={i} className="flex justify-between items-center bg-cream rounded-xl px-4 py-3 border border-gray-100">
                    <span className="font-medium text-sm text-gray-800">{dish.name}</span>
                    {dish.price && <span className="text-accent font-bold text-sm">{dish.price}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 출처별 평가 */}
          <div>
            <h3 className="font-bold text-primary text-base mb-3">출처별 평가</h3>
            <div className="space-y-2">
              {r.ratings.michelin && (
                <div className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                  <span className="font-semibold text-sm text-red-700 flex items-center gap-2">
                    🌟 미슐랭 가이드
                  </span>
                  <span className="text-red-600 font-black">
                    {r.ratings.michelin.type === 'star' ? `${'★'.repeat(r.ratings.michelin.grade)} ${r.ratings.michelin.grade}스타` : '빕 구르망 🍜'}
                  </span>
                </div>
              )}
              {r.ratings.blueribbon && (
                <div className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                  <span className="font-semibold text-sm text-blue-700 flex items-center gap-2">
                    🎗️ 블루리본 서베이
                  </span>
                  <span className="text-blue-600 font-black">{r.ratings.blueribbon.grade}리본</span>
                </div>
              )}
              {r.ratings.sikshin && (
                <div className="flex items-center justify-between bg-orange-50 rounded-xl px-4 py-3 border border-orange-100">
                  <span className="font-semibold text-sm text-orange-700 flex items-center gap-2">
                    🔥 식신
                  </span>
                  <span className="text-orange-600 font-black">{r.ratings.sikshin.score}점</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
