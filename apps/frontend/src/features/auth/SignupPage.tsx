import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { FormField } from '@/components/common/FormField';
import { PasswordInput } from '@/components/common/PasswordInput';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { applyApiErrors } from '@/lib/forms';
import { signupSchema, SignupValues } from '@/lib/validation';
import { authService } from '@/services/auth.service';

export function SignupPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  const onSubmit = handleSubmit(async ({ confirmPassword: _c, ...body }) => {
    setFormError(null);
    try {
      await authService.register(body);
      toast.success('Account created. Please log in.');
      navigate('/login', { replace: true });
    } catch (e) {
      setFormError(applyApiErrors(e, setError, ['name', 'email', 'address', 'password']));
    }
  });

  return (
    <AuthLayout title="Create your account" subtitle="Sign up as a normal user to rate stores." footer={<>Already registered? <Link className="font-medium text-primary hover:underline" to="/login">Log in</Link></>}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{formError}</div>}
        <FormField label="Full name" hint="20 to 60 characters" error={errors.name?.message}><Input autoComplete="name" {...register('name')} /></FormField>
        <FormField label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" {...register('email')} /></FormField>
        <FormField label="Address" hint="Up to 400 characters" error={errors.address?.message}><Textarea autoComplete="street-address" {...register('address')} /></FormField>
        <FormField label="Password" hint="8-16 characters, at least one uppercase letter and one special character" error={errors.password?.message}><PasswordInput autoComplete="new-password" {...register('password')} /></FormField>
        <FormField label="Confirm password" error={errors.confirmPassword?.message}><PasswordInput autoComplete="new-password" {...register('confirmPassword')} /></FormField>
        <Button type="submit" className="w-full" loading={isSubmitting}>Create account</Button>
      </form>
    </AuthLayout>
  );
}
