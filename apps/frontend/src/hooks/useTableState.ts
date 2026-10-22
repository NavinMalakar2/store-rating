import { useCallback, useState } from 'react';
import { SortOrder } from '@/types';

interface State<F extends Record<string, string | undefined>> {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: SortOrder;
  filters: F;
}

/** Server-side table state: any filter/sort/limit change resets to page 1. */
export function useTableState<F extends Record<string, string | undefined>>(initial: { sortBy: string; sortOrder?: SortOrder; limit?: number; filters: F }) {
  const [state, setState] = useState<State<F>>({
    page: 1,
    limit: initial.limit ?? 10,
    sortBy: initial.sortBy,
    sortOrder: initial.sortOrder ?? 'asc',
    filters: initial.filters,
  });

  const setPage = useCallback((page: number) => setState((s) => ({ ...s, page })), []);
  const setLimit = useCallback((limit: number) => setState((s) => ({ ...s, limit, page: 1 })), []);
  const setFilter = useCallback(
    <K extends keyof F>(key: K, value: F[K]) => setState((s) => (s.filters[key] === value ? s : { ...s, filters: { ...s.filters, [key]: value }, page: 1 })),
    [],
  );
  const setSort = useCallback((sortBy: string, sortOrder?: SortOrder) =>
    setState((s) => ({ ...s, sortBy, sortOrder: sortOrder ?? (s.sortBy === sortBy && s.sortOrder === 'asc' ? 'desc' : 'asc'), page: 1 })), []);

  const params = { page: state.page, limit: state.limit, sortBy: state.sortBy, sortOrder: state.sortOrder, ...state.filters };
  return { state, params, setPage, setLimit, setFilter, setSort };
}
