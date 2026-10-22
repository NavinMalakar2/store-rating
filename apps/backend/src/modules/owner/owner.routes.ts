import { Request, Response, Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, validatedQuery } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { pageMeta, sendSuccess } from '../../utils/response';
import { paginationFields, textFilter } from '../../validation/common';
import { getOwnerDashboard, OwnerRatingsQuery } from './owner.service';

export const ownerQuerySchema = z.object({
  ...paginationFields,
  search: textFilter,
  sortBy: z.enum(['userName', 'userEmail', 'rating', 'createdAt', 'updatedAt']).default('createdAt'),
});

export const ownerRoutes = Router();
ownerRoutes.use(authenticate, authorize(Role.STORE_OWNER));

ownerRoutes.get(
  '/dashboard',
  validate({ query: ownerQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const q = validatedQuery<OwnerRatingsQuery>(req);
    const { ratings, total, ...rest } = await getOwnerDashboard(req.user!.id, q);
    sendSuccess(res, { ...rest, ratings }, { meta: pageMeta(q.page, q.limit, total) });
  }),
);
