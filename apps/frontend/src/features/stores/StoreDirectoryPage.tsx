import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowDownAZ, ArrowUpAZ, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { SearchInput } from '@/components/tables/SearchInput';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTableState } from '@/hooks/useTableState';
import { errorMessage } from '@/lib/api';
import { formatRating } from '@/lib/utils';
import { storeService } from '@/services/store.service';
import { RatingSelector } from '../ratings/RatingSelector';
import { RatingStars } from '../ratings/RatingStars';
import { useRateStore } from '../ratings/useRateStore';
import { Pagination } from '@/components/tables/Pagination';
import { DirectoryStore } from '@/types';

function StoreCard({ store }: { store: DirectoryStore }) {
  const rate = useRateStore();
  return (
    <Card className="flex flex-col gap-4 p-5" data-testid="store-card">
      <div>
        <h2 className="font-semibold leading-snug">{store.name}</h2>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{store.address}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Overall rating</dt>
          <dd className="mt-1 flex items-center gap-2">
            {store.averageRating === null ? <span className="text-muted-foreground">Not rated yet</span> : <><RatingStars value={store.averageRating} /><span className="font-medium">{formatRating(store.averageRating)}</span></>}
          </dd>
          {store.ratingCount > 0 && <dd className="text-xs text-muted-foreground">{store.ratingCount} rating{store.ratingCount === 1 ? '' : 's'}</dd>}
        </div>
        <div>
          <dt className="text-muted-foreground">Your rating</dt>
          <dd className="mt-1 flex items-center gap-2">
            {store.myRating === null ? <span className="text-muted-foreground">Not rated by you</span> : <><RatingStars value={store.myRating} /><span className="font-medium">{store.myRating} / 5</span></>}
          </dd>
        </div>
      </dl>
      <div className="mt-auto border-t pt-4">
        <RatingSelector current={store.myRating} storeName={store.name} saving={rate.isPending && rate.variables?.store.id === store.id} onSave={(rating) => rate.mutate({ store, rating })} />
      </div>
    </Card>
  );
}

export function StoreDirectoryPage() {
  const t = useTableState<{ search?: string }>({ sortBy: 'name', limit: 9, filters: { search: '' } });
  const query = useQuery({
    queryKey: ['stores', t.params],
    queryFn: ({ signal }) => storeService.list(t.params, signal),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <PageHeader title="Stores" description="Browse registered stores, then submit or update your rating." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={t.state.filters.search ?? ''} onChange={(v) => t.setFilter('search', v)} placeholder="Search by store name or address" label="Search stores" />
        <Select aria-label="Sort by" className="w-44" value={t.state.sortBy} onChange={(e) => t.setSort(e.target.value, t.state.sortOrder)}>
          <option value="name">Sort: Name</option>
          <option value="address">Sort: Address</option>
          <option value="rating">Sort: Overall rating</option>
          <option value="myRating">Sort: My rating</option>
        </Select>
        <Button variant="outline" onClick={() => t.setSort(t.state.sortBy, t.state.sortOrder === 'asc' ? 'desc' : 'asc')} aria-label={`Sort order: ${t.state.sortOrder === 'asc' ? 'ascending' : 'descending'}`}>
          {t.state.sortOrder === 'asc' ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />} {t.state.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        </Button>
        {t.state.filters.search && <Button variant="ghost" onClick={() => t.setFilter('search', '')}>Reset</Button>}
      </div>

      {query.isError && !query.data ? (
        <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-60" />)}</div>
      ) : query.data && query.data.items.length === 0 ? (
        <Card><EmptyState title={t.state.filters.search ? 'No stores match your search' : 'No stores registered yet'} description={t.state.filters.search ? 'Try a different name or address.' : 'Stores added by an administrator will appear here.'} /></Card>
      ) : (
        <>
          <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${query.isFetching ? 'opacity-70' : ''}`}>{query.data?.items.map((s) => <StoreCard key={s.id} store={s} />)}</div>
          {query.data && <Pagination meta={query.data.meta} onPageChange={t.setPage} />}
        </>
      )}
    </div>
  );
}
