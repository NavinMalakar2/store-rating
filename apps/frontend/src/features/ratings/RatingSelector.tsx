import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  /** The persisted rating (null when the user has not rated yet). The selector never invents a default. */
  current: number | null;
  saving: boolean;
  onSave: (value: number) => void;
  storeName: string;
}

export function RatingSelector({ current, saving, onSave, storeName }: Props) {
  const [selected, setSelected] = useState<number | null>(current);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => setSelected(current), [current]);

  const shown = hover ?? selected ?? 0;
  const changed = selected !== null && selected !== current;

  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label={`Your rating for ${storeName}`} className="flex items-center gap-1" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={selected === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            disabled={saving}
            onClick={() => setSelected(n)}
            onMouseEnter={() => setHover(n)}
            className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          >
            <Star className={cn('h-6 w-6 transition-colors', n <= shown ? 'fill-star text-star' : 'text-muted-foreground/40')} />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground" aria-live="polite">{selected ? `${selected} / 5` : 'Select a rating'}</span>
      </div>
      <Button size="sm" disabled={!changed} loading={saving} onClick={() => selected && onSave(selected)}>
        {current === null ? 'Submit rating' : 'Update rating'}
      </Button>
    </div>
  );
}
