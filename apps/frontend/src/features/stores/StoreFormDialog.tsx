import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Select, Textarea } from '@/components/ui/input';
import { applyApiErrors } from '@/lib/forms';
import { storeSchema, StoreValues } from '@/lib/validation';
import { adminService } from '@/services/admin.service';
import { AdminStore } from '@/types';

interface Props { open: boolean; store: AdminStore | null; onClose: () => void }

export function StoreFormDialog({ open, store, onClose }: Props) {
  const qc = useQueryClient();
  const editing = !!store;
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<StoreValues>({ resolver: zodResolver(storeSchema) });

  useEffect(() => {
    if (open) reset({ name: store?.name ?? '', email: store?.email ?? '', address: store?.address ?? '', ownerId: store?.owner?.id ?? '' });
    setFormError(null);
  }, [open, store, reset]);

  // Backend filter: only store owners that do not own a store yet (the current owner is added below).
  const owners = useQuery({
    queryKey: ['admin', 'users', 'owners-free'],
    queryFn: () => adminService.users({ role: 'STORE_OWNER', withoutStore: true, limit: 100, sortBy: 'name', sortOrder: 'asc' }),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (v: StoreValues) => {
      const body = { name: v.name, email: v.email, address: v.address, ownerId: v.ownerId || null };
      return editing ? adminService.updateStore(store!.id, body) : adminService.createStore(body);
    },
    onSuccess: () => { toast.success(editing ? 'Store updated' : 'Store created'); qc.invalidateQueries({ queryKey: ['admin'] }); qc.invalidateQueries({ queryKey: ['stores'] }); onClose(); },
    onError: (e) => setFormError(applyApiErrors(e, setError, ['name', 'email', 'address', 'ownerId'])),
  });

  return (
    <Dialog open={open} onClose={onClose} title={editing ? 'Edit store' : 'Add store'} description="Store names must be 20-60 characters.">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-4">
        {formError && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{formError}</div>}
        <FormField label="Store name" error={errors.name?.message}><Input {...register('name')} /></FormField>
        <FormField label="Store email" error={errors.email?.message}><Input type="email" {...register('email')} /></FormField>
        <FormField label="Address" error={errors.address?.message}><Textarea {...register('address')} /></FormField>
        <FormField label="Owner" hint="Only store owners without a store are listed." error={errors.ownerId?.message}>
          <Select {...register('ownerId')}>
            <option value="">No owner</option>
            {store?.owner && <option value={store.owner.id}>{store.owner.name} (current)</option>}
            {owners.data?.items.filter((o) => o.id !== store?.owner?.id).map((o) => <option key={o.id} value={o.id}>{o.name} — {o.email}</option>)}
          </Select>
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>{editing ? 'Save changes' : 'Create store'}</Button>
        </div>
      </form>
    </Dialog>
  );
}
