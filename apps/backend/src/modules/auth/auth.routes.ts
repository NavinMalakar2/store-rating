import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as c from './auth.controller';
import { changePasswordSchema, loginSchema, registerSchema } from './auth.schemas';

export const authRoutes = Router();

authRoutes.post('/register', authLimiter, validate({ body: registerSchema }), asyncHandler(c.register));
authRoutes.post('/login', authLimiter, validate({ body: loginSchema }), asyncHandler(c.login));
authRoutes.post('/logout', c.logout);
authRoutes.get('/me', authenticate, asyncHandler(c.me));
authRoutes.patch('/password', authenticate, authLimiter, validate({ body: changePasswordSchema }), asyncHandler(c.changePassword));
