import { Request, Response } from 'express';
import { validatedQuery } from '../../middleware/validate';
import { pageMeta, sendSuccess } from '../../utils/response';
import { StoreSortField } from './store.repository';
import * as svc from './store.service';

interface ListQuery {
  page: number;
  limit: number;
  sortOrder: 'asc' | 'desc';
  sortBy: StoreSortField;
  search?: string;
  name?: string;
  email?: string;
  address?: string;
  unowned?: boolean;
}

// ---- Normal-user store directory ----
export const listDirectory = async (req: Request, res: Response) => {
  const q = validatedQuery<ListQuery>(req);
  const { items, total } = await svc.listDirectory({ ...q, viewerId: req.user!.id });
  sendSuccess(res, items, { meta: pageMeta(q.page, q.limit, total) });
};

export const getDirectoryStore = async (req: Request, res: Response) => {
  sendSuccess(res, await svc.getDirectoryStore(req.params.id, req.user!.id));
};

// ---- Admin store management ----
export const listAdminStores = async (req: Request, res: Response) => {
  const q = validatedQuery<ListQuery>(req);
  const { items, total } = await svc.listAdminStores(q);
  sendSuccess(res, items, { meta: pageMeta(q.page, q.limit, total) });
};

export const getAdminStore = async (req: Request, res: Response) => {
  sendSuccess(res, await svc.getAdminStore(req.params.id));
};

export const createStore = async (req: Request, res: Response) => {
  sendSuccess(res, await svc.createStore(req.body), { status: 201, message: 'Store created successfully' });
};

export const updateStore = async (req: Request, res: Response) => {
  sendSuccess(res, await svc.updateStore(req.params.id, req.body), { message: 'Store updated successfully' });
};
