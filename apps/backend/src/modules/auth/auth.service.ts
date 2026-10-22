import bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';
import { rethrowUnique } from '../../errors/prismaErrors';
import { signToken } from '../../utils/jwt';

export const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  address: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

// Used to keep login timing similar when the e-mail does not exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', env.BCRYPT_ROUNDS);

export const hashPassword = (plain: string) => bcrypt.hash(plain, env.BCRYPT_ROUNDS);

export async function createUser(
  data: { name: string; email: string; address: string; password: string; role: Role },
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const passwordHash = await hashPassword(data.password);
  try {
    return await db.user.create({
      data: { name: data.name, email: data.email, address: data.address, passwordHash, role: data.role },
      select: safeUserSelect,
    });
  } catch (e) {
    rethrowUnique(e, { email: 'An account with this email already exists' }, 'An account with this email already exists');
  }
}

export const registerUser = (data: { name: string; email: string; address: string; password: string }) =>
  createUser({ ...data, role: Role.USER });

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw AppError.unauthorized('Invalid email or password');

  const token = signToken({ sub: user.id, role: user.role });
  const { passwordHash: _omit, updatedAt: _u, ...safe } = user;
  return { token, user: safe };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: safeUserSelect });
  if (!user) throw AppError.unauthorized('Your account no longer exists.');
  return user;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.unauthorized();

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    throw AppError.badRequest('Current password is incorrect', [
      { field: 'currentPassword', message: 'Current password is incorrect' },
    ]);
  }
  if (currentPassword === newPassword) {
    throw AppError.unprocessable('New password must be different from the current password', [
      { field: 'newPassword', message: 'New password must be different from the current password' },
    ]);
  }
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } });
}
