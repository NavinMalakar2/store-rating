import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Read-only star display; `value` is rounded to the nearest whole star for the icons. */
export function RatingStars({ value, className }: { value: number | null; className?: string }) {
  const filled = value === null ? 0 : Math.round(value);
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn('h-4 w-4', n <= filled ? 'fill-star text-star' : 'text-muted-foreground/40')} />
      ))}
    </span>
  );
}
