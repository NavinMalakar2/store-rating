import { PageMeta } from '@/types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) || '/api/v1';
const TIMEOUT_MS = 15000;

export interface FieldError { field?: string; message: string }

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
  }
}

let unauthorizedHandler: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { unauthorizedHandler = fn; };

type Query = Record<string, string | number | boolean | undefined | null>;

interface Options { body?: unknown; query?: Query; signal?: AbortSignal }
export interface ApiResult<T> { data: T; meta?: PageMeta; message: string }

function buildUrl(path: string, query?: Query) {
  const qs = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const s = qs.toString();
  return `${BASE}${path}${s ? `?${s}` : ''}`;
}

async function request<T>(method: string, path: string, opts: Options = {}): Promise<ApiResult<T>> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, TIMEOUT_MS);
  opts.signal?.addEventListener('abort', () => controller.abort());

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller.signal,
    });
  } catch (e) {
    if (opts.signal?.aborted) throw e; // cancelled by TanStack Query — not an error to display
    throw new ApiError(0, timedOut ? 'The request timed out. Please try again.' : 'Unable to reach the server. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  let json: { success?: boolean; message?: string; data?: T; meta?: PageMeta; errors?: FieldError[] } | null = null;
  try { json = await res.json(); } catch { /* non-JSON response */ }

  if (!res.ok || !json?.success) {
    if (res.status === 401 && !path.startsWith('/auth/')) unauthorizedHandler?.();
    throw new ApiError(res.status, json?.message ?? 'Unexpected response from the server.', json?.errors ?? []);
  }
  return { data: json.data as T, meta: json.meta, message: json.message ?? '' };
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
};

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');
