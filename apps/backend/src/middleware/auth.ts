import { NextFunction, Request, RequestHandler, Response } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../errors/AppError';
import { verifyToken } from '../utils/jwt';

export const AUTH_COOKIE = 'srp_token';

/** Verifies the JWT cookie and loads the *current* user (role is read from the DB, never trusted from the client). */
export const authenticate: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.[AUTH_COOKIE];
    if (!token) throw AppError.unauthorized();

    let claims;
    try {
      claims = verifyToken(token);
    } catch {
      throw AppError.unauthorized('Your session is invalid or has expired. Please log in again.');
    }

    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, role: true, name: true, email: true },
    });
    if (!user) throw AppError.unauthorized('Your account no longer exists.');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
