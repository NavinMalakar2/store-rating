import { z } from 'zod';
import { addressSchema, emailSchema, nameSchema, paginationFields, textFilter } from '../../validation/common';
import { STORE_SORT_FIELDS } from './store.repository';

export const directoryQuerySchema = z.object({
  ...paginationFields,
  search: textFilter,
  name: textFilter,
  address: textFilter,
  sortBy: z.enum(['name', 'address', 'rating', 'myRating']).default('name'),
});

export const adminStoreQuerySchema = z.object({
  ...paginationFields,
  search: textFilter,
  name: textFilter,
  email: textFilter,
  address: textFilter,
  unowned: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  sortBy: z.enum(STORE_SORT_FIELDS.filter((f) => f !== 'myRating') as [string, ...string[]]).default('name'),
});

export const createStoreSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  address: addressSchema,
  ownerId: z.string().uuid('Invalid owner id').nullish(),
});

export const updateStoreSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    address: addressSchema.optional(),
    ownerId: z.string().uuid('Invalid owner id').nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });
