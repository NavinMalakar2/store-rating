import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { idParamSchema } from '../../validation/common';
import * as c from './store.controller';
import { adminStoreQuerySchema, createStoreSchema, directoryQuerySchema, updateStoreSchema } from './store.schemas';
import { ratingRoutes } from '../ratings/rating.routes';

/** /api/v1/stores — store directory for normal users (+ their rating operations). */
export const storeRoutes = Router();
storeRoutes.use(authenticate, authorize(Role.USER));
storeRoutes.get('/', validate({ query: directoryQuerySchema }), asyncHandler(c.listDirectory));
storeRoutes.get('/:id', validate({ params: idParamSchema }), asyncHandler(c.getDirectoryStore));
storeRoutes.use('/:storeId/ratings', ratingRoutes);

/** Mounted under /api/v1/admin/stores */
export const adminStoreRoutes = Router();
adminStoreRoutes.get('/', validate({ query: adminStoreQuerySchema }), asyncHandler(c.listAdminStores));
adminStoreRoutes.post('/', validate({ body: createStoreSchema }), asyncHandler(c.createStore));
adminStoreRoutes.get('/:id', validate({ params: idParamSchema }), asyncHandler(c.getAdminStore));
adminStoreRoutes.patch('/:id', validate({ params: idParamSchema, body: updateStoreSchema }), asyncHandler(c.updateStore));
