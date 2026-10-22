import { RequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie auth: state-changing requests must (a) carry a custom header that
 * cross-site forms cannot set and (b) come from the configured frontend origin when Origin is sent.
 * Combined with SameSite=Lax cookies and a strict CORS allow-list.
 */
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (origin && origin !== env.FRONTEND_URL) return next(AppError.forbidden('Request origin is not allowed'));
  if (req.get('x-requested-with') !== 'XMLHttpRequest') {
    return next(AppError.forbidden('Missing CSRF protection header'));
  }
  next();
};
