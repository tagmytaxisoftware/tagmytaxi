/**
 * @fileoverview Structured request logging middleware.
 * Logs method, path, status, and duration for every request.
 */

import type { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string | undefined) ?? uuidv4();
  const start = Date.now();

  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    console[level]('[request]', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      tenantId: req.tenant?.tenantId ?? 'unknown',
      userId: req.user?.userId ?? 'anonymous',
    });
  });

  next();
}
