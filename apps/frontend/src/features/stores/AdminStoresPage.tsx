import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { SearchInput } from '@/components/tables/SearchInput';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { useTableState } from '@/hooks/useTableState';
import { errorMessage } from '@/lib/api';
import { formatRating } from '@/lib/utils';
import { adminService } from '@/services/admin.service';
import { AdminStore } from '@/types';
import { RatingStars } from '../ratings/RatingStars';
import { StoreFormDialog } from './StoreFormDialog';

const col = createColumnHelper<AdminStore>();

export function AdminStoresPage() {
  const t = useTableState<{ search?: string; unowned?: string }>({ sortBy: 'name', filters: { search: '', unowned: '' } });
  const [dialog, setDialog] = useState<{ open: boolean; store: AdminStore | null }>({ open: false, store: null });

  const q = useQuery({
    queryKey: ['admin', 'stores', 'list', t.params],
    queryFn: ({ signal }) => adminService.stores(t.params, signal),
    placeholderData: keepPreviousData,
  });

  const columns = [
    col.accessor('name', { header: 'Store name', meta: { sortField: 'name' }, cell: (c) => <span className="font-medium">{c.getValue()}</span> }),
    col.accessor('email', { header: 'Email', meta: { sortField: 'email' } }),
    col.accessor('address', { header: 'Address', meta: { sortField: 'address', className: 'max-w-xs' }, cell: (c) => <span className="line-clamp-2">{c.getValue()}</span> }),
    col.accessor('averageRating', {
      header: 'Rating',
      meta: { sortField: 'rating' },
      cell: (c) => c.getValue() === null ? <span className="text-muted-foreground">Not rated yet</span> : <span className="flex items-center gap-2"><RatingStars value={c.getValue()} />{formatRating(c.getValue())}</span>,
    }),
    col.accessor((r) => r.owner?.name ?? null, { id: 'owner', header: 'Owner', meta: { sortField: 'ownerName' }, cell: (c) => c.getValue() ?? <span className="text-muted-foreground">Unassigned</span> }),
    col.display({ id: 'actions', header: 'Actions', cell: (c) => <Button variant="outline" size="sm" onClick={() => setDialog({ open: true, store: c.row.original })}><Pencil className="h-4 w-4" /> Edit</Button> }),
  ];

  return (
    <div>
      <PageHeader title="Stores" description="Register stores and assign their owners." actions={<Button onClick={() => setDialog({ open: true, store: null })}><Plus className="h-4 w-4" /> Add store</Button>} />
      <DataTable
        columns={columns}
        data={q.data?.items ?? []}
        meta={q.data?.meta}
        sortBy={t.state.sortBy}
        sortOrder={t.state.sortOrder}
        onSort={(f) => t.setSort(f)}
        onPageChange={t.setPage}
        onLimitChange={t.setLimit}
        limit={t.state.limit}
        isLoading={q.isLoading}
        isFetching={q.isFetching}
        error={q.isError && !q.data ? errorMessage(q.error) : null}
        onRetry={() => q.refetch()}
        emptyTitle="No stores found"
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput value={t.state.filters.search ?? ''} onChange={(v) => t.setFilter('search', v)} placeholder="Search name, email or address" label="Search stores" />
            <Select aria-label="Filter by owner" className="w-44" value={t.state.filters.unowned} onChange={(e) => t.setFilter('unowned', e.target.value)}>
              <option value="">All stores</option>
              <option value="true">Without owner</option>
            </Select>
          </div>
        }
      />
      <StoreFormDialog open={dialog.open} store={dialog.store} onClose={() => setDialog({ open: false, store: null })} />
    </div>
  );
}
