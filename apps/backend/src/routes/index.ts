import { Router } from 'express';
import { prisma } from '../database/prisma';
import { csrfProtection } from '../middleware/csrf';
import { asyncHandler } from '../utils/asyncHandler';
import { adminRoutes } from '../modules/admin/admin.routes';
import { authRoutes } from '../modules/auth/auth.routes';
import { ownerRoutes } from '../modules/owner/owner.routes';
import { storeRoutes } from '../modules/stores/store.routes';

export const apiRouter = Router();

apiRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, message: 'OK', data: { status: 'up' } });
  }),
);

apiRouter.use(csrfProtection);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/stores', storeRoutes);
apiRouter.use('/owner', ownerRoutes);
