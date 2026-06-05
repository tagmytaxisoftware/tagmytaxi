/**
 * @fileoverview JWT authentication middleware.
 * Validates Bearer tokens and attaches the authenticated user to req.user.
 */

import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import type { AuthUser, JWTPayload } from '@tagmytaxi/shared';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'changeme-in-production';

/**
 * Extracts and validates a JWT from the Authorization header (Bearer scheme)
 * or the `token` cookie. Attaches the decoded user to `req.user`.
 *
 * Returns 401 for missing/expired/invalid tokens.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const tokenFromCookie = req.cookies?.['token'] as string | undefined;

  const token =
    authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : tokenFromCookie;

  if (!token) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication token required.' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = {
      userId: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
    };
    next();
  } catch (err) {
    const isExpired = err instanceof jwt.TokenExpiredError;
    res.status(401).json({
      code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      message: isExpired
        ? 'Your session has expired. Please log in again.'
        : 'Invalid authentication token.',
    });
  }
}
