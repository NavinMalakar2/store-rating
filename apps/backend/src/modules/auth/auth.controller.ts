import { CookieOptions, Request, Response } from 'express';
import { env, isProd } from '../../config/env';
import { AUTH_COOKIE } from '../../middleware/auth';
import { sendSuccess } from '../../utils/response';
import * as authService from './auth.service';
import { signToken } from '../../utils/jwt';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd || env.COOKIE_SECURE,
  path: '/',
  maxAge: 8 * 60 * 60 * 1000,
};

export const register = async (req: Request, res: Response) => {
  const user = await authService.registerUser(req.body);
  sendSuccess(res, user, { status: 201, message: 'Registration successful. You can now log in.' });
};

export const login = async (req: Request, res: Response) => {
  const { token, user } = await authService.login(req.body.email, req.body.password);
  res.cookie(AUTH_COOKIE, token, cookieOptions);
  sendSuccess(res, user, { message: 'Logged in successfully' });
};

export const logout = (_req: Request, res: Response) => {
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions, maxAge: undefined });
  sendSuccess(res, null, { message: 'Logged out successfully' });
};

export const me = async (req: Request, res: Response) => {
  sendSuccess(res, await authService.getProfile(req.user!.id));
};

export const changePassword = async (req: Request, res: Response) => {
  await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  // Re-issue the cookie after a credential change.
  res.cookie(AUTH_COOKIE, signToken({ sub: req.user!.id, role: req.user!.role }), cookieOptions);
  sendSuccess(res, null, { message: 'Password updated successfully' });
};
