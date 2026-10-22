import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormField } from '@/components/common/FormField';
import { PasswordInput } from '@/components/common/PasswordInput';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Select, Textarea } from '@/components/ui/input';
import { ROLE_LABELS } from '@/constants';
import { applyApiErrors } from '@/lib/forms';
import { userSchema, UserValues } from '@/lib/validation';
import { adminService } from '@/services/admin.service';

const FIELDS = ['name', 'email', 'address', 'password', 'role', 'storeId', 'newStore.name', 'newStore.email', 'newStore.address'];

export function UserFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, watch, reset, setError, formState: { errors } } = useForm<UserValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: 'USER', storeMode: 'none' },
  });
  const role = watch('role');
  const mode = watch('storeMode');

  const unowned = useQuery({
    queryKey: ['admin', 'stores', 'unowned'],
    queryFn: () => adminService.stores({ unowned: true, limit: 100, sortBy: 'name', sortOrder: 'asc' }),
    enabled: open && role === 'STORE_OWNER',
  });

  const mutation = useMutation({
    mutationFn: (v: UserValues) => {
      const body: Record<string, unknown> = { name: v.name, email: v.email, address: v.address, password: v.password, role: v.role };
      if (v.role === 'STORE_OWNER' && v.storeMode === 'existing') body.storeId = v.storeId;
      if (v.role === 'STORE_OWNER' && v.storeMode === 'new') body.newStore = { name: v.storeName, email: v.storeEmail, address: v.storeAddress };
      return adminService.createUser(body);
    },
    onSuccess: () => {
      toast.success('User created');
      qc.invalidateQueries({ queryKey: ['admin'] });
      reset({ role: 'USER', storeMode: 'none' });
      setFormError(null);
      onClose();
    },
    onError: (e) => {
      const msg = applyApiErrors(e, setError, FIELDS);
      setFormError(msg);
    },
  });

  const close = () => { reset({ role: 'USER', storeMode: 'none' }); setFormError(null); onClose(); };

  return (
    <Dialog open={open} onClose={close} title="Add user" description="Create a normal user, administrator or store owner.">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-4">
        {formError && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{formError}</div>}
        <FormField label="Name" hint="20 to 60 characters" error={errors.name?.message}><Input {...register('name')} /></FormField>
        <FormField label="Email" error={errors.email?.message}><Input type="email" {...register('email')} /></FormField>
        <FormField label="Address" error={errors.address?.message}><Textarea {...register('address')} /></FormField>
        <FormField label="Password" hint="8-16 characters, one uppercase letter, one special character" error={errors.password?.message}><PasswordInput autoComplete="new-password" {...register('password')} /></FormField>
        <FormField label="Role" error={errors.role?.message}>
          <Select {...register('role')}>
            {(['USER', 'ADMIN', 'STORE_OWNER'] as const).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </Select>
        </FormField>

        {role === 'STORE_OWNER' && (
          <fieldset className="space-y-3 rounded-md border p-4">
            <legend className="px-1 text-sm font-medium">Store association</legend>
            <FormField label="Store">
              <Select {...register('storeMode')}>
                <option value="none">No store yet</option>
                <option value="existing">Assign an existing store</option>
                <option value="new">Create a new store for this owner</option>
              </Select>
            </FormField>
            {mode === 'existing' && (
              <FormField label="Unassigned store" error={errors.storeId?.message}>
                <Select {...register('storeId')}>
                  <option value="">{unowned.isLoading ? 'Loading…' : 'Select a store'}</option>
                  {unowned.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </FormField>
            )}
            {mode === 'new' && (
              <>
                <FormField label="Store name" error={errors.storeName?.message}><Input {...register('storeName')} /></FormField>
                <FormField label="Store email" error={errors.storeEmail?.message}><Input type="email" {...register('storeEmail')} /></FormField>
                <FormField label="Store address" error={errors.storeAddress?.message}><Textarea {...register('storeAddress')} /></FormField>
              </>
            )}
          </fieldset>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>Create user</Button>
        </div>
      </form>
    </Dialog>
  );
}
