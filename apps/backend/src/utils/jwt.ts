import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';

const ISSUER = 'store-rating-platform';

export interface TokenClaims {
  sub: string;
  role: Role;
}

export const signToken = (claims: TokenClaims) =>
  jwt.sign(claims, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: ISSUER,
  });

export const verifyToken = (token: string): TokenClaims => {
  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'], issuer: ISSUER });
  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new Error('Malformed token');
  }
  return { sub: payload.sub, role: (payload as jwt.JwtPayload).role as Role };
};
