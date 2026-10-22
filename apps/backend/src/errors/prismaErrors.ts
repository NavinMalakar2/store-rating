import { Prisma } from '@prisma/client';
import { AppError } from './AppError';

/** Fields involved in a unique violation (works for both engines/driver adapters). */
export function uniqueFields(e: unknown): string[] | null {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== 'P2002') return null;
  const meta = e.meta as { target?: unknown; driverAdapterError?: { cause?: { constraint?: { fields?: unknown[]; index?: unknown } } } } | undefined;
  const fromTarget = meta?.target;
  if (Array.isArray(fromTarget)) return fromTarget.map(String);
  if (typeof fromTarget === 'string') return [fromTarget];
  const constraint = meta?.driverAdapterError?.cause?.constraint;
  if (constraint?.fields) return constraint.fields.map(String);
  if (constraint?.index) return [String(constraint.index)];
  return [];
}

/**
 * Re-throws a unique violation as a 409 with a friendly message.
 * `messages` maps a column name (e.g. "email") to the message to show.
 */
export function rethrowUnique(e: unknown, messages: Record<string, string>, fallback: string): never {
  const fields = uniqueFields(e);
  if (fields === null) throw e;
  const hit = Object.keys(messages).find((k) => fields.some((f) => f.includes(k)));
  const message = hit ? messages[hit] : fallback;
  throw AppError.conflict(message, hit ? [{ field: hit, message }] : []);
}
