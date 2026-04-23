export function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function isCurrentlyOpen(hours: Record<string, string | undefined>): boolean {
  const now = new Date();
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayKey = days[now.getDay()];
  const todayHours = hours[todayKey];

  if (!todayHours || todayHours === '휴무') return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const slots = todayHours.split(',').map(s => s.trim());
  for (const slot of slots) {
    const [start, end] = slot.split('–').map(t => {
      const [h, m] = t.trim().split(':').map(Number);
      return h * 60 + m;
    });
    if (currentMinutes >= start && currentMinutes < end) return true;
  }
  return false;
}

const DAY_LABELS: Record<string, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
};

export function getDayLabel(key: string): string {
  return DAY_LABELS[key] ?? key;
}
