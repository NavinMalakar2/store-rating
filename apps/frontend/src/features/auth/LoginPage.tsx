import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { useAuth } from '@/app/providers/AuthProvider';
import { FormField } from '@/components/common/FormField';
import { PasswordInput } from '@/components/common/PasswordInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HOME_BY_ROLE } from '@/constants';
import { errorMessage } from '@/lib/api';
import { loginSchema, LoginValues } from '@/lib/validation';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await login(values.email, values.password);
      navigate(HOME_BY_ROLE[user.role], { replace: true }); // role comes from the server response
    } catch (e) {
      setFormError(errorMessage(e));
    }
  });

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to rate stores or manage the platform." footer={<>New here? <Link className="font-medium text-primary hover:underline" to="/signup">Create an account</Link></>}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{formError}</div>}
        <FormField label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" {...register('email')} /></FormField>
        <FormField label="Password" error={errors.password?.message}><PasswordInput autoComplete="current-password" {...register('password')} /></FormField>
        <Button type="submit" className="w-full" loading={isSubmitting}>Log in</Button>
      </form>
    </AuthLayout>
  );
}
