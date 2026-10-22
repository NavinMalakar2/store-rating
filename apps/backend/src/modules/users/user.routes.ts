import { Request, Response, Router } from 'express';
import { validate, validatedQuery } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { pageMeta, sendSuccess } from '../../utils/response';
import { idParamSchema } from '../../validation/common';
import { createUserSchema, updateUserSchema, userListQuerySchema } from './user.schemas';
import * as svc from './user.service';

/** Mounted under /api/v1/admin/users (admin-only guard applied by the parent router). */
export const adminUserRoutes = Router();

adminUserRoutes.get(
  '/',
  validate({ query: userListQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const q = validatedQuery<svc.UserListQuery>(req);
    const { items, total } = await svc.listUsers(q);
    sendSuccess(res, items, { meta: pageMeta(q.page, q.limit, total) });
  }),
);

adminUserRoutes.post(
  '/',
  validate({ body: createUserSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await svc.createUserWithStore(req.body), { status: 201, message: 'User created successfully' });
  }),
);

adminUserRoutes.get(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => sendSuccess(res, await svc.getUserDetail(req.params.id))),
);

adminUserRoutes.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateUserSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await svc.updateUser(req.params.id, req.body), { message: 'User updated successfully' });
  }),
);
