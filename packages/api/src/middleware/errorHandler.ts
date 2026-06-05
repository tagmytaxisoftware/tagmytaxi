/**
 * @fileoverview Central Express error handler.
 * Maps known error types to HTTP status codes. Never leaks stack traces in production.
 */

import type { ErrorRequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found.`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Insufficient permissions.') {
    super('FORBIDDEN', message, 403);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const traceId = uuidv4();
  const isProd = process.env['NODE_ENV'] === 'production';

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      traceId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Unhandled errors — log internally, return generic message to client
  console.error('[error-handler]', { traceId, error: err });

  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: isProd ? 'An unexpected error occurred.' : (err as Error).message,
    traceId,
    timestamp: new Date().toISOString(),
  });
};
