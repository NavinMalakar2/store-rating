import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const tones = {
  default: 'bg-muted text-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-amber-100 text-amber-800',
};

export const Badge = ({ tone = 'default', className, ...p }: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) => (
  <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone], className)} {...p} />
);
