import { z } from 'zod';
import { addressSchema, emailSchema, nameSchema, passwordSchema } from '../../validation/common';

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    address: addressSchema,
    password: passwordSchema,
  })
  .strip(); // any "role" supplied by the client is discarded

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required').max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string({ required_error: 'Current password is required' }).min(1, 'Current password is required').max(200),
  newPassword: passwordSchema,
});
