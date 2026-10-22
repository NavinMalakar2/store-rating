import { ReactNode, useId, cloneElement, isValidElement } from 'react';

interface Props {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

/** Label + control + inline error, wired with aria attributes. */
export function FormField({ label, error, hint, children }: Props) {
  const id = useId();
  const control = isValidElement<Record<string, unknown>>(children)
    ? cloneElement(children, { id, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-err` : hint ? `${id}-hint` : undefined })
    : children;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {control}
      {hint && !error && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
