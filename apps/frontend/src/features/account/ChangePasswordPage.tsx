import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormField } from '@/components/common/FormField';
import { PageHeader } from '@/components/common/PageHeader';
import { PasswordInput } from '@/components/common/PasswordInput';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { applyApiErrors } from '@/lib/forms';
import { changePasswordSchema, ChangePasswordValues } from '@/lib/validation';
import { authService } from '@/services/auth.service';

export function ChangePasswordPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  const mutation = useMutation({
    mutationFn: (v: ChangePasswordValues) => authService.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword }),
    onSuccess: (message) => { toast.success(message || 'Password updated'); setFormError(null); reset(); },
    onError: (e) => setFormError(applyApiErrors(e, setError, ['currentPassword', 'newPassword'])),
  });

  return (
    <div className="max-w-xl">
      <PageHeader title="Change password" description="Choose a new password for your account." />
      <Card className="p-6">
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-4">
          {formError && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{formError}</div>}
          <FormField label="Current password" error={errors.currentPassword?.message}><PasswordInput autoComplete="current-password" {...register('currentPassword')} /></FormField>
          <FormField label="New password" hint="8-16 characters, at least one uppercase letter and one special character" error={errors.newPassword?.message}><PasswordInput autoComplete="new-password" {...register('newPassword')} /></FormField>
          <FormField label="Confirm new password" error={errors.confirmPassword?.message}><PasswordInput autoComplete="new-password" {...register('confirmPassword')} /></FormField>
          <Button type="submit" loading={mutation.isPending}>Update password</Button>
        </form>
      </Card>
    </div>
  );
}
