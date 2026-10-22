import { Request, Response, Router } from 'express';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { ratingSchema, storeIdParamSchema } from '../../validation/common';
import * as svc from './rating.service';

// mergeParams so :storeId from the parent router is visible. Auth + USER role are applied by the parent.
export const ratingRoutes = Router({ mergeParams: true });

ratingRoutes.post(
  '/',
  validate({ params: storeIdParamSchema, body: ratingSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const store = await svc.submitRating(req.user!.id, req.params.storeId, req.body.rating);
    sendSuccess(res, store, { status: 201, message: 'Rating submitted successfully' });
  }),
);

ratingRoutes.patch(
  '/',
  validate({ params: storeIdParamSchema, body: ratingSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const store = await svc.updateRating(req.user!.id, req.params.storeId, req.body.rating);
    sendSuccess(res, store, { message: 'Rating updated successfully' });
  }),
);
