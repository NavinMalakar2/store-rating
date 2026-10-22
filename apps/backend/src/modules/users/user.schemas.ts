import { z } from 'zod';
import { addressSchema, emailSchema, nameSchema, passwordSchema, paginationFields, textFilter } from '../../validation/common';

export const USER_SORT_FIELDS = ['name', 'email', 'address', 'role', 'createdAt'] as const;
const roleEnum = z.enum(['ADMIN', 'USER', 'STORE_OWNER']);

export const userListQuerySchema = z.object({
  ...paginationFields,
  search: textFilter,
  name: textFilter,
  email: textFilter,
  address: textFilter,
  role: roleEnum.optional(),
  withoutStore: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  sortBy: z.enum(USER_SORT_FIELDS).default('name'),
});

const newStoreSchema = z.object({ name: nameSchema, email: emailSchema, address: addressSchema });

export const createUserSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    address: addressSchema,
    password: passwordSchema,
    role: roleEnum,
    /** STORE_OWNER only: attach an existing, unowned store ... */
    storeId: z.string().uuid('Invalid store id').optional(),
    /** ... or create a brand-new store for this owner in the same transaction. */
    newStore: newStoreSchema.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.role !== 'STORE_OWNER' && (v.storeId || v.newStore)) {
      ctx.addIssue({ code: 'custom', path: ['role'], message: 'Only store owners can be associated with a store' });
    }
    if (v.storeId && v.newStore) {
      ctx.addIssue({ code: 'custom', path: ['storeId'], message: 'Choose an existing store or create a new one, not both' });
    }
  });

/** Only safe profile fields; role changes are intentionally not supported. */
export const updateUserSchema = z
  .object({ name: nameSchema.optional(), email: emailSchema.optional(), address: addressSchema.optional() })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });
