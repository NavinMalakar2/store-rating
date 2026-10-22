import { Request, Response, Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { adminStoreRoutes } from '../stores/store.routes';
import { adminUserRoutes } from '../users/user.routes';
import { getAdminDashboard } from './admin.service';

export const adminRoutes = Router();
adminRoutes.use(authenticate, authorize(Role.ADMIN));

adminRoutes.get('/dashboard', asyncHandler(async (_req: Request, res: Response) => sendSuccess(res, await getAdminDashboard())));
adminRoutes.use('/users', adminUserRoutes);
adminRoutes.use('/stores', adminStoreRoutes);
