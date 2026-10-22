import { RequestHandler } from 'express';
import { isTest } from '../config/env';

/** Structured (JSON) access log. Never logs bodies, cookies or headers. */
export const requestLogger: RequestHandler = (req, res, next) => {
  if (isTest) return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(
      JSON.stringify({
        level: 'info',
        time: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        durationMs: Math.round(ms * 10) / 10,
        userId: req.user?.id,
      }),
    );
  });
  next();
};
