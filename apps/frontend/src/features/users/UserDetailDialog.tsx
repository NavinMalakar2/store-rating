import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState, LoadingState } from '@/components/feedback/States';
import { ROLE_LABELS } from '@/constants';
import { errorMessage } from '@/lib/api';
import { formatDateTime, formatRating } from '@/lib/utils';
import { adminService } from '@/services/admin.service';
import { RatingStars } from '../ratings/RatingStars';

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-3 gap-2 border-b py-2.5 text-sm last:border-0"><dt className="text-muted-foreground">{label}</dt><dd className="col-span-2 break-words">{children}</dd></div>
);

export function UserDetailDialog({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const q = useQuery({ queryKey: ['admin', 'users', userId], queryFn: () => adminService.user(userId!), enabled: !!userId });
  const u = q.data;
  return (
    <Dialog open={!!userId} onClose={onClose} title="User details">
      {q.isLoading && <LoadingState />}
      {q.isError && <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />}
      {u && (
        <dl>
          <Row label="Name">{u.name}</Row>
          <Row label="Email">{u.email}</Row>
          <Row label="Address">{u.address}</Row>
          <Row label="Role"><Badge tone="primary">{ROLE_LABELS[u.role]}</Badge></Row>
          <Row label="Created">{formatDateTime(u.createdAt)}</Row>
          {u.role === 'STORE_OWNER' && (
            <Row label="Store">
              {u.store ? (
                <div className="space-y-1">
                  <p className="font-medium">{u.store.name}</p>
                  <p className="text-muted-foreground">{u.store.address}</p>
                  <p className="flex items-center gap-2"><RatingStars value={u.store.averageRating} /> {formatRating(u.store.averageRating)} {u.store.ratingCount > 0 && <span className="text-xs text-muted-foreground">({u.store.ratingCount} ratings)</span>}</p>
                </div>
              ) : <span className="text-muted-foreground">No store assigned</span>}
            </Row>
          )}
        </dl>
      )}
    </Dialog>
  );
}
