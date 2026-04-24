import { MapPin, SearchX, Wifi, ServerCrash } from 'lucide-react';

type EmptyType = 'no-results' | 'location-denied' | 'network-error' | 'server-error';

const CONFIG: Record<EmptyType, {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  action?: { label: string };
}> = {
  'no-results':      { Icon: SearchX,    title: '맛집을 찾지 못했어요',    desc: '필터를 조정하거나 다른 지역을 검색해보세요',   action: { label: '필터 초기화' } },
  'location-denied': { Icon: MapPin,     title: '위치를 알 수 없어요',     desc: '설정에서 위치 권한을 허용해주세요',            action: { label: '다시 시도' } },
  'network-error':   { Icon: Wifi,       title: '연결에 문제가 생겼어요',  desc: '인터넷 연결을 확인하고 다시 시도해주세요',     action: { label: '다시 시도' } },
  'server-error':    { Icon: ServerCrash,title: '잠시 문제가 생겼어요',   desc: '불편을 드려 죄송합니다. 잠시 후 다시 시도해주세요', action: { label: '다시 시도' } },
};

interface Props {
  type?: EmptyType;
  onAction?: () => void;
}

export default function EmptyState({ type = 'no-results', onAction }: Props) {
  const { Icon, title, desc, action } = CONFIG[type];
  return (
    <div
      role={type === 'server-error' || type === 'network-error' ? 'alert' : 'status'}
      aria-live="polite"
      className="flex flex-col items-center justify-center px-8 py-16 text-center"
    >
      <Icon className="w-16 h-16 text-gray-300 mb-4" aria-hidden="true" />
      <p className="text-lg font-semibold text-gray-800 mb-2">{title}</p>
      <p className="text-sm text-gray-500 mb-6">{desc}</p>
      {action && onAction && (
        <button
          onClick={onAction}
          className="border border-primary text-primary rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-primary-light transition-colors"
          aria-label={action.label}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
