import { z } from 'zod';

export const nameSchema = z
  .string({ required_error: 'Name is required', invalid_type_error: 'Name must be text' })
  .trim()
  .min(20, 'Name must be at least 20 characters')
  .max(60, 'Name must be at most 60 characters');

export const addressSchema = z
  .string({ required_error: 'Address is required', invalid_type_error: 'Address must be text' })
  .trim()
  .min(1, 'Address is required')
  .max(400, 'Address must be at most 400 characters');

export const emailSchema = z
  .string({ required_error: 'Email is required', invalid_type_error: 'Email must be text' })
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long')
  .email('Enter a valid email address');

export const passwordSchema = z
  .string({ required_error: 'Password is required', invalid_type_error: 'Password must be text' })
  .min(8, 'Password must be at least 8 characters')
  .max(16, 'Password must be at most 16 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const ratingSchema = z.object({
  rating: z
    .number({ required_error: 'Rating is required', invalid_type_error: 'Rating must be a number' })
    .int('Rating must be a whole number')
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
});

export const idParamSchema = z.object({ id: z.string().uuid('Invalid id') });
export const storeIdParamSchema = z.object({ storeId: z.string().uuid('Invalid store id') });

/** Optional trimmed text filter; empty strings are treated as "not provided". */
export const textFilter = z
  .string()
  .trim()
  .max(100, 'Filter value is too long')
  .optional()
  .transform((v) => (v ? v : undefined));

export const paginationFields = {
  page: z.coerce.number().int('page must be an integer').min(1, 'page must be at least 1').default(1),
  limit: z.coerce.number().int('limit must be an integer').min(1, 'limit must be at least 1').max(100, 'limit must be at most 100').default(10),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
};
