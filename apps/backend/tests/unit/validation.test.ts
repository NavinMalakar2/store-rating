import { describe, expect, it } from 'vitest';
import { addressSchema, emailSchema, nameSchema, paginationFields, passwordSchema, ratingSchema } from '../../src/validation/common';
import { z } from 'zod';
import { buildDistribution, averageOf } from '../../src/utils/ratings';
import { authorize } from '../../src/middleware/auth';
import { AppError } from '../../src/errors/AppError';
import { registerSchema } from '../../src/modules/auth/auth.schemas';
import { Role } from '@prisma/client';

const ok = (s: z.ZodTypeAny, v: unknown) => s.safeParse(v).success;

describe('name validation', () => {
  it('accepts 20-60 chars after trimming', () => {
    expect(ok(nameSchema, 'a'.repeat(20))).toBe(true);
    expect(ok(nameSchema, 'a'.repeat(60))).toBe(true);
    expect(nameSchema.parse('  ' + 'a'.repeat(20) + '  ')).toBe('a'.repeat(20));
  });
  it('rejects too short, too long, empty and whitespace-only', () => {
    expect(ok(nameSchema, 'a'.repeat(19))).toBe(false);
    expect(ok(nameSchema, 'a'.repeat(61))).toBe(false);
    expect(ok(nameSchema, '')).toBe(false);
    expect(ok(nameSchema, ' '.repeat(30))).toBe(false);
    expect(ok(nameSchema, '  ' + 'a'.repeat(18) + '  ')).toBe(false); // validated AFTER trim
  });
});

describe('address validation', () => {
  it('requires 1-400 chars', () => {
    expect(ok(addressSchema, 'x'.repeat(400))).toBe(true);
    expect(ok(addressSchema, 'x'.repeat(401))).toBe(false);
    expect(ok(addressSchema, '   ')).toBe(false);
    expect(ok(addressSchema, undefined)).toBe(false);
  });
});

describe('password validation', () => {
  it.each([['Abcdef1!', true], ['Abcdefgh1234567!', true], ['Abcde1!', false], ['Abcdefgh12345678!', false], ['abcdefg1!', false], ['Abcdefg12', false]])(
    '%s -> %s',
    (pw, expected) => expect(ok(passwordSchema, pw)).toBe(expected),
  );
});

describe('email normalization', () => {
  it('lower-cases and trims', () => expect(emailSchema.parse('  Foo@Bar.COM ')).toBe('foo@bar.com'));
  it('rejects invalid', () => expect(ok(emailSchema, 'not-an-email')).toBe(false));
});

describe('rating validation', () => {
  it.each([1, 2, 3, 4, 5])('accepts %s', (r) => expect(ok(ratingSchema, { rating: r })).toBe(true));
  it.each([0, 6, -1, 3.5, '4', null, undefined, NaN])('rejects %s', (r) => expect(ok(ratingSchema, { rating: r })).toBe(false));
});

describe('registration', () => {
  it('discards a client-supplied role', () => {
    const out = registerSchema.parse({ name: 'a'.repeat(20), email: 'a@b.co', address: 'x', password: 'Abcdef1!', role: 'ADMIN' });
    expect(out).not.toHaveProperty('role');
  });
});

describe('pagination params', () => {
  const s = z.object(paginationFields);
  it('applies defaults', () => expect(s.parse({})).toEqual({ page: 1, limit: 10, sortOrder: 'asc' }));
  it('coerces numeric strings', () => expect(s.parse({ page: '2', limit: '25' })).toMatchObject({ page: 2, limit: 25 }));
  it.each([{ page: '0' }, { page: '-1' }, { page: 'abc' }, { limit: '101' }, { limit: '0' }, { sortOrder: 'sideways' }, { page: '1.5' }])('rejects %j', (q) =>
    expect(s.safeParse(q).success).toBe(false),
  );
});

describe('rating aggregation helpers', () => {
  it('fills the 1..5 distribution', () => {
    expect(buildDistribution([{ rating: 5, count: 2 }, { rating: 3, count: 1 }]).map((d) => d.count)).toEqual([0, 0, 1, 0, 2]);
  });
  it('rounds to 2 decimals and keeps null for no ratings', () => {
    expect(averageOf(4.3333333)).toBe(4.33);
    expect(averageOf(null)).toBeNull();
  });
});

describe('role authorization middleware', () => {
  const run = (role: Role | undefined, allowed: Role[]) => {
    let err: unknown = 'unset';
    authorize(...allowed)({ user: role ? { id: '1', role, name: '', email: '' } : undefined } as never, {} as never, (e?: unknown) => (err = e));
    return err;
  };
  it('allows matching role', () => expect(run('ADMIN', ['ADMIN'])).toBeUndefined());
  it('403 for the wrong role', () => expect((run('USER', ['ADMIN']) as AppError).status).toBe(403));
  it('401 when unauthenticated', () => expect((run(undefined, ['ADMIN']) as AppError).status).toBe(401));
});
