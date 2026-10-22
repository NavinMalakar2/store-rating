import { createColumnHelper } from '@tanstack/react-table';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { MapPin, MessageSquare, Star } from 'lucide-react';
import { DistributionChart } from '@/components/common/DistributionChart';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';
import { DataTable } from '@/components/tables/DataTable';
import { SearchInput } from '@/components/tables/SearchInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTableState } from '@/hooks/useTableState';
import { errorMessage } from '@/lib/api';
import { formatDateTime, formatRating } from '@/lib/utils';
import { ownerService } from '@/services/store.service';
import { OwnerRating } from '@/types';
import { RatingStars } from '../ratings/RatingStars';

const col = createColumnHelper<OwnerRating>();

export function OwnerDashboardPage() {
  const t = useTableState<{ search?: string }>({ sortBy: 'createdAt', sortOrder: 'desc', filters: { search: '' } });
  const q = useQuery({
    queryKey: ['owner', 'dashboard', t.params],
    queryFn: ({ signal }) => ownerService.dashboard(t.params, signal),
    placeholderData: keepPreviousData,
  });

  if (q.isLoading) return <LoadingState label="Loading your store…" />;
  if (q.isError && !q.data) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const { data, meta } = q.data!;

  if (!data.store) {
    return <><PageHeader title="My store" /><Card><EmptyState title="No store is associated with your account" description="Ask an administrator to assign a store to your account." /></Card></>;
  }

  const columns = [
    col.accessor((r) => r.user.name, { id: 'userName', header: 'User', meta: { sortField: 'userName' }, cell: (c) => <span className="font-medium">{c.getValue()}</span> }),
    col.accessor((r) => r.user.email, { id: 'userEmail', header: 'Email', meta: { sortField: 'userEmail' } }),
    col.accessor('rating', { header: 'Rating', meta: { sortField: 'rating' }, cell: (c) => <span className="flex items-center gap-2"><RatingStars value={c.getValue()} />{c.getValue()} / 5</span> }),
    col.accessor('createdAt', { header: 'Submitted', meta: { sortField: 'createdAt' }, cell: (c) => formatDateTime(c.getValue()) }),
    col.accessor('updatedAt', { header: 'Last updated', meta: { sortField: 'updatedAt' }, cell: (c) => formatDateTime(c.getValue()) }),
  ];

  return (
    <div>
      <PageHeader title={data.store.name} description={data.store.address} />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Average rating" icon={<Star className="h-5 w-5" />} value={data.stats.averageRating === null ? 'Not rated yet' : <span className="flex items-center gap-2">{formatRating(data.stats.averageRating)} <RatingStars value={data.stats.averageRating} /></span>} />
        <StatCard label="Total ratings" icon={<MessageSquare className="h-5 w-5" />} value={data.stats.totalRatings} />
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Rating distribution</CardTitle></CardHeader>
        <CardContent><DistributionChart data={data.stats.distribution} /></CardContent>
      </Card>
      <h2 className="mb-3 mt-8 flex items-center gap-2 text-lg font-semibold"><MapPin className="h-4 w-4 text-muted-foreground" /> Users who rated your store</h2>
      <DataTable
        columns={columns}
        data={data.ratings}
        meta={meta}
        sortBy={t.state.sortBy}
        sortOrder={t.state.sortOrder}
        onSort={(f) => t.setSort(f)}
        onPageChange={t.setPage}
        onLimitChange={t.setLimit}
        limit={t.state.limit}
        isLoading={false}
        isFetching={q.isFetching}
        emptyTitle={t.state.filters.search ? 'No matching ratings' : 'No ratings yet'}
        emptyDescription={t.state.filters.search ? 'Try a different name or email.' : 'Ratings will appear here once users rate your store.'}
        toolbar={<SearchInput value={t.state.filters.search ?? ''} onChange={(v) => t.setFilter('search', v)} placeholder="Search by user name or email" label="Search ratings" />}
      />
    </div>
  );
}
