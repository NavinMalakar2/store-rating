import { useQuery } from '@tanstack/react-query';
import { Star, Store, Users } from 'lucide-react';
import { DistributionChart } from '@/components/common/DistributionChart';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { ErrorState } from '@/components/feedback/States';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ROLE_LABELS } from '@/constants';
import { errorMessage } from '@/lib/api';
import { adminService } from '@/services/admin.service';

export function AdminDashboardPage() {
  const q = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: adminService.dashboard });
  if (q.isError) return <><PageHeader title="Dashboard" /><ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /></>;
  const d = q.data;
  return (
    <div>
      <PageHeader title="Dashboard" description="Live platform statistics from the database." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total users" value={d?.totalUsers} icon={<Users className="h-5 w-5" />} loading={q.isLoading} hint="Admins, normal users and store owners" />
        <StatCard label="Total stores" value={d?.totalStores} icon={<Store className="h-5 w-5" />} loading={q.isLoading} />
        <StatCard label="Total ratings" value={d?.totalRatings} icon={<Star className="h-5 w-5" />} loading={q.isLoading} hint={d?.averageRating != null ? `Platform average ${d.averageRating.toFixed(2)}` : 'No ratings yet'} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Rating distribution</CardTitle></CardHeader>
          <CardContent>{d ? <DistributionChart data={d.ratingDistribution} /> : <div className="h-56" />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Users by role</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {d?.usersByRole.map((r) => (
                <li key={r.role} className="flex items-center justify-between"><span>{ROLE_LABELS[r.role]}</span><span className="font-semibold">{r.count}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
