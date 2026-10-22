import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Eye, Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { SearchInput } from '@/components/tables/SearchInput';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { ROLE_LABELS } from '@/constants';
import { useTableState } from '@/hooks/useTableState';
import { errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { adminService } from '@/services/admin.service';
import { AdminUser } from '@/types';
import { UserDetailDialog } from './UserDetailDialog';
import { UserFormDialog } from './UserFormDialog';

const col = createColumnHelper<AdminUser>();

export function UsersPage() {
  const t = useTableState<{ search?: string; role?: string }>({ sortBy: 'name', filters: { search: '', role: '' } });
  const [creating, setCreating] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['admin', 'users', 'list', t.params],
    queryFn: ({ signal }) => adminService.users(t.params, signal),
    placeholderData: keepPreviousData,
  });

  const columns = [
    col.accessor('name', { header: 'Name', meta: { sortField: 'name' }, cell: (c) => <span className="font-medium">{c.getValue()}</span> }),
    col.accessor('email', { header: 'Email', meta: { sortField: 'email' } }),
    col.accessor('address', { header: 'Address', meta: { sortField: 'address', className: 'max-w-xs' }, cell: (c) => <span className="line-clamp-2">{c.getValue()}</span> }),
    col.accessor('role', { header: 'Role', meta: { sortField: 'role' }, cell: (c) => <Badge tone={c.getValue() === 'ADMIN' ? 'warning' : c.getValue() === 'STORE_OWNER' ? 'success' : 'default'}>{ROLE_LABELS[c.getValue()]}</Badge> }),
    col.accessor('createdAt', { header: 'Created', meta: { sortField: 'createdAt' }, cell: (c) => formatDate(c.getValue()) }),
    col.display({ id: 'actions', header: 'Actions', cell: (c) => <Button variant="outline" size="sm" onClick={() => setViewId(c.row.original.id)}><Eye className="h-4 w-4" /> View</Button> }),
  ];

  return (
    <div>
      <PageHeader title="Users" description="Manage normal users, administrators and store owners." actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Add user</Button>} />
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
        emptyTitle="No users found"
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput value={t.state.filters.search ?? ''} onChange={(v) => t.setFilter('search', v)} placeholder="Search name, email or address" label="Search users" />
            <Select aria-label="Filter by role" className="w-44" value={t.state.filters.role} onChange={(e) => t.setFilter('role', e.target.value)}>
              <option value="">All roles</option>
              {(['USER', 'ADMIN', 'STORE_OWNER'] as const).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </Select>
          </div>
        }
      />
      <UserFormDialog open={creating} onClose={() => setCreating(false)} />
      <UserDetailDialog userId={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}
