import { z } from 'zod';

// Mirrors the backend rules exactly (the backend remains the final authority).
export const nameField = z.string().trim().min(20, 'Name must be at least 20 characters').max(60, 'Name must be at most 60 characters');
export const addressField = z.string().trim().min(1, 'Address is required').max(400, 'Address must be at most 400 characters');
export const emailField = z.string().trim().min(1, 'Email is required').email('Enter a valid email address');
export const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(16, 'Password must be at most 16 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z
  .object({
    name: nameField,
    email: emailField,
    address: addressField,
    password: passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'New password must be different from the current one' });

export const storeSchema = z.object({
  name: nameField,
  email: emailField,
  address: addressField,
  ownerId: z.string().optional(),
});

export const userSchema = z
  .object({
    name: nameField,
    email: emailField,
    address: addressField,
    password: passwordField,
    role: z.enum(['ADMIN', 'USER', 'STORE_OWNER']),
    storeMode: z.enum(['none', 'existing', 'new']),
    storeId: z.string().optional(),
    storeName: z.string().optional(),
    storeEmail: z.string().optional(),
    storeAddress: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.role !== 'STORE_OWNER') return;
    if (v.storeMode === 'existing' && !v.storeId) {
      ctx.addIssue({ code: 'custom', path: ['storeId'], message: 'Select a store' });
    }
    if (v.storeMode === 'new') {
      const checks: [string, z.ZodTypeAny, string | undefined][] = [
        ['storeName', nameField, v.storeName],
        ['storeEmail', emailField, v.storeEmail],
        ['storeAddress', addressField, v.storeAddress],
      ];
      for (const [path, schema, value] of checks) {
        const r = schema.safeParse(value ?? '');
        if (!r.success) ctx.addIssue({ code: 'custom', path: [path], message: r.error.issues[0].message });
      }
    }
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
export type StoreValues = z.infer<typeof storeSchema>;
export type UserValues = z.infer<typeof userSchema>;
