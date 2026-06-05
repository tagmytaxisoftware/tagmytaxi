/**
 * @fileoverview Role-based access control middleware.
 * Validates that the authenticated user holds the required permission.
 */

import type { NextFunction, Request, Response } from 'express';
import type { Permission } from '@tagmytaxi/shared';

/**
 * Middleware factory that returns a handler requiring the specified permission.
 * Must be used after the `authenticate` middleware.
 *
 * @param permission - The {@link Permission} required to access the route.
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required.' });
      return;
    }

    if (!req.user.permissions.includes(permission)) {
      res.status(403).json({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Permission '${permission}' is required for this action.`,
      });
      return;
    }

    next();
  };
}
