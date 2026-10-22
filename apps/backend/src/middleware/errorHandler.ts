import { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';
import { isProd, isTest } from '../config/env';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl.split('?')[0]}`));
};

const log = (err: unknown) => {
  if (isTest) return;
  const e = err as Error;
  console.error(JSON.stringify({ level: 'error', time: new Date().toISOString(), name: e?.name, message: e?.message, stack: isProd ? undefined : e?.stack }));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, message: err.message, errors: err.errors });
  }
  if (err instanceof ZodError) {
    const errors = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return res.status(422).json({ success: false, message: 'Validation failed', errors });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Malformed JSON request body', errors: [] });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body is too large', errors: [] });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, message: 'A record with these unique values already exists', errors: [] });
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Record not found', errors: [] });
    if (err.code === 'P2003') return res.status(409).json({ success: false, message: 'Related record is missing or still in use', errors: [] });
  }
  if (err instanceof Prisma.PrismaClientInitializationError || err?.code === 'ECONNREFUSED') {
    log(err);
    return res.status(503).json({ success: false, message: 'The database is currently unavailable. Please try again shortly.', errors: [] });
  }
  log(err);
  return res.status(500).json({ success: false, message: 'Something went wrong on our side. Please try again.', errors: [] });
};
