import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError, errorMessage } from '@/lib/api';
import { storeService } from '@/services/store.service';
import { DirectoryStore } from '@/types';

/** Creates or updates the signed-in user's rating, then refreshes every store query from the server. */
export function useRateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ store, rating }: { store: DirectoryStore; rating: number }) =>
      store.myRating === null ? storeService.submitRating(store.id, rating) : storeService.updateRating(store.id, rating),
    onSuccess: (_d, { store }) => toast.success(store.myRating === null ? 'Rating submitted' : 'Rating updated'),
    onError: (e) => toast.error(e instanceof ApiError && e.status === 409 ? 'You have already rated this store — the list has been refreshed.' : errorMessage(e)),
    // Displayed values only change once the backend has confirmed and the data is refetched.
    onSettled: () => qc.invalidateQueries({ queryKey: ['stores'] }),
  });
}
