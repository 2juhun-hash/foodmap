import type { Hours } from '@/types';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export function getBusinessStatus(hours?: Hours): 'open' | 'closed' | 'unknown' {
  if (!hours) return 'unknown';
  const now = new Date();
  const dayKey = DAY_KEYS[now.getDay()];
  const todayHours = hours[dayKey as keyof Hours];
  if (!todayHours || todayHours === '휴무') return 'closed';

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const ranges = todayHours.split(',').map(s => s.trim());

  for (const range of ranges) {
    // em dash(–), en dash(—), 하이픈(-) 모두 허용
    const parts = range.split(/[-–—]/).map(t => t.trim());
    if (parts.length < 2) continue;
    const start = parseTime(parts[0]);
    const end = parseTime(parts[1]);
    if (start === null || end === null) continue;

    if (end < start) {
      // 자정 넘기는 케이스 (예: 22:00–02:00)
      if (currentMinutes >= start || currentMinutes < end) return 'open';
    } else {
      if (currentMinutes >= start && currentMinutes < end) return 'open';
    }
  }
  return 'closed';
}

function parseTime(timeStr: string): number | null {
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

export const STATUS_LABEL: Record<string, string> = {
  open: '영업중',
  closed: '영업종료',
  unknown: '정보없음',
};

export const DAY_LABEL: Record<string, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목',
  fri: '금', sat: '토', sun: '일',
};
