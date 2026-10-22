import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { PAGE_SIZE_OPTIONS } from '@/constants';
import { cn } from '@/lib/utils';
import { PageMeta, SortOrder } from '@/types';

/** Columns opt into server-side sorting by setting `meta: { sortField: 'name' }`. */
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> { sortField?: string; className?: string }
}

interface Props<T> {
  columns: ColumnDef<T, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  data: T[];
  meta?: PageMeta;
  sortBy: string;
  sortOrder: SortOrder;
  onSort: (field: string) => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  limit: number;
  isLoading: boolean;
  isFetching?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbar?: ReactNode;
}

export function DataTable<T>(p: Props<T>) {
  const table = useReactTable({ data: p.data, columns: p.columns, getCoreRowModel: getCoreRowModel(), manualSorting: true, manualPagination: true });

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      {p.toolbar && <div className="border-b p-4">{p.toolbar}</div>}
      <div className={cn('overflow-x-auto transition-opacity', p.isFetching && !p.isLoading && 'opacity-60')}>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/60 text-left">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const field = h.column.columnDef.meta?.sortField;
                  const active = field && p.sortBy === field;
                  return (
                    <th key={h.id} scope="col" className="px-4 py-3 font-medium" aria-sort={active ? (p.sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}>
                      {field ? (
                        <button type="button" onClick={() => p.onSort(field)} className="inline-flex items-center gap-1 hover:text-primary">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {active ? (p.sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {p.isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t">
                  {p.columns.map((_c, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>)}
                </tr>
              ))}
            {!p.isLoading && !p.error && table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t hover:bg-muted/40">
                {row.getVisibleCells().map((c) => (
                  <td key={c.id} className={cn('px-4 py-3 align-top', c.column.columnDef.meta?.className)}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {p.error && <ErrorState message={p.error} onRetry={p.onRetry} />}
      {!p.isLoading && !p.error && p.data.length === 0 && <EmptyState title={p.emptyTitle ?? 'No records found'} description={p.emptyDescription ?? 'Try changing your search or filters.'} />}
      {p.meta && !p.error && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{p.meta.totalRecords} record{p.meta.totalRecords === 1 ? '' : 's'}</span>
            <Select aria-label="Rows per page" className="h-8 w-auto" value={p.limit} onChange={(e) => p.onLimitChange(Number(e.target.value))}>
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Page {p.meta.currentPage} of {p.meta.totalPages}</span>
            <Button variant="outline" size="icon" aria-label="Previous page" disabled={p.meta.currentPage <= 1} onClick={() => p.onPageChange(p.meta!.currentPage - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" aria-label="Next page" disabled={p.meta.currentPage >= p.meta.totalPages} onClick={() => p.onPageChange(p.meta!.currentPage + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
