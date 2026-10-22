import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';

interface Props { value: string; onChange: (v: string) => void; placeholder?: string; label?: string }

/** Local text state, debounced before it reaches the (server-side) filter state. */
export function SearchInput({ value, onChange, placeholder = 'Search…', label = 'Search' }: Props) {
  const [text, setText] = useState(value);
  const debounced = useDebounce(text, 350);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    onChange(debounced.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  return (
    <div className="relative min-w-[220px] flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input aria-label={label} className="pl-9 pr-9" placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} />
      {text && (
        <button type="button" aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" onClick={() => { setText(''); onChange(''); }}>
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
