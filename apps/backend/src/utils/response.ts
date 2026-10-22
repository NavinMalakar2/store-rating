import { Response } from 'express';

export interface PageMeta {
  totalRecords: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

export const pageMeta = (page: number, limit: number, total: number): PageMeta => ({
  totalRecords: total,
  currentPage: page,
  pageSize: limit,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

export function sendSuccess<T>(
  res: Response,
  data: T,
  opts: { status?: number; message?: string; meta?: unknown } = {},
) {
  return res.status(opts.status ?? 200).json({
    success: true,
    message: opts.message ?? 'Request completed successfully',
    data,
    ...(opts.meta ? { meta: opts.meta } : {}),
  });
}
