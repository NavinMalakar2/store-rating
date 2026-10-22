import rateLimit from 'express-rate-limit';
import { isTest } from '../config/env';

const json = (message: string) => ({ success: false, message, errors: [] });

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Too many attempts. Please try again in a few minutes.'),
  skip: () => isTest,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Too many requests. Please slow down.'),
  skip: () => isTest,
});
