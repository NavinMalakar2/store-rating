import { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const LoadingState = ({ label = 'Loading…' }: { label?: string }) => (
  <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
    <Loader2 className="h-4 w-4 animate-spin" /> {label}
  </div>
);

export const EmptyState = ({ title, description, action }: { title: string; description?: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center gap-2 py-12 text-center">
    <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden />
    <p className="font-medium">{title}</p>
    {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
    {action}
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
    <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
    <p className="max-w-md text-sm">{message}</p>
    {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>}
  </div>
);
