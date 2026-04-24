import { cn } from '@/lib/utils';

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-shimmer rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%]', className)}
      aria-hidden="true"
    />
  );
}

export function RestaurantCardSkeleton() {
  return (
    <div className="flex gap-3 p-4 border-b border-divider" aria-label="로딩 중">
      <Shimmer className="w-24 h-24 flex-shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-1.5">
          <Shimmer className="w-16 h-4 rounded" />
          <Shimmer className="w-12 h-4 rounded" />
        </div>
        <Shimmer className="w-40 h-5 rounded" />
        <Shimmer className="w-24 h-4 rounded" />
        <Shimmer className="w-32 h-4 rounded" />
      </div>
    </div>
  );
}

export default function LoadingSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label={`${count}개 항목 로딩 중`}>
      {Array.from({ length: count }).map((_, i) => (
        <RestaurantCardSkeleton key={i} />
      ))}
    </div>
  );
}
