import type { Ratings } from '../types';

interface Props {
  ratings: Ratings;
  size?: 'sm' | 'md';
}

export default function RatingBadge({ ratings, size = 'sm' }: Props) {
  const cls = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <div className="flex flex-wrap gap-1">
      {ratings.michelin && (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-red-600 text-white ${cls}`}>
          {'★'.repeat(ratings.michelin.grade)}
          {ratings.michelin.type === 'bib' ? ' 빕' : ''}
          <span className="opacity-80 ml-0.5">미슐랭</span>
        </span>
      )}
      {ratings.blueribbon && (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-blue-600 text-white ${cls}`}>
          {'🎗️'.repeat(Math.min(ratings.blueribbon.grade, 3))}
          <span className="opacity-80 ml-0.5">블루리본</span>
        </span>
      )}
      {ratings.sikshin && (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-orange-500 text-white ${cls}`}>
          🔥 {ratings.sikshin.score}
          <span className="opacity-80 ml-0.5">식신</span>
        </span>
      )}
    </div>
  );
}
