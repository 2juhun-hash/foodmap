import type { Source, SourceType } from '@/types';
import { cn } from '@/lib/utils';

const CONFIG: Record<SourceType, { label: string; textColor: string; bgColor: string }> = {
  blueribbon: { label: '블루리본', textColor: 'text-[#1A3A8F]', bgColor: 'bg-[#E8EEF9]' },
  michelin:   { label: '미슐랭',   textColor: 'text-[#B01B14]', bgColor: 'bg-[#FDE8E7]' },
  sikshin:    { label: '식신',     textColor: 'text-[#C04E00]', bgColor: 'bg-[#FEF0E6]' },
};

interface Props {
  source: Source;
  size?: 'sm' | 'md';
  className?: string;
}

export default function SourceBadge({ source, size = 'md', className }: Props) {
  const cfg = CONFIG[source.source_type];
  if (!cfg) return null;
  const gradeText = source.grade_type === 'star'
    ? '★'.repeat(source.grade ?? 0)
    : source.grade_type === 'bib'
    ? 'Bib'
    : source.score !== undefined
    ? `${source.score}`
    : source.grade !== undefined
    ? `${source.grade}`
    : '';

  return (
    <span
      aria-label={`${cfg.label} 등재${gradeText ? ` ${gradeText}` : ''}`}
      className={cn(
        'inline-flex items-center gap-1 rounded font-semibold',
        cfg.textColor, cfg.bgColor,
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-1',
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" aria-hidden="true" />
      {cfg.label}
      {gradeText && <span className="ml-0.5">{gradeText}</span>}
    </span>
  );
}
