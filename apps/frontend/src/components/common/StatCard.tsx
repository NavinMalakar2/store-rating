import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Props { label: string; value: ReactNode; icon: ReactNode; loading?: boolean; hint?: string }

export const StatCard = ({ label, value, icon, loading, hint }: Props) => (
  <Card className="flex items-center gap-4 p-5">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      {loading ? <Skeleton className="mt-1 h-7 w-20" /> : <p className="truncate text-2xl font-semibold">{value}</p>}
      {hint && !loading && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  </Card>
);
