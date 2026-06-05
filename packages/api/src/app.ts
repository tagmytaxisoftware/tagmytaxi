/**
 * @fileoverview Express application factory.
 * Configures middleware, routes, and error handling.
 */

import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { tenantResolver } from './middleware/tenantResolver';
import authRoutes from './routes/auth';
import billingRoutes from './routes/billing';
import driverRoutes from './routes/drivers';
import healthRoutes from './routes/health';
import rideRoutes from './routes/rides';

export function createApp(): express.Application {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  }));

  // CORS — configured per tenant in production; permissive in development
  app.use(cors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Request-Id'],
    credentials: true,
  }));

  app.use(compression());
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Global rate limiter — stricter per-route limiters apply to auth endpoints
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
  }));

  app.use(requestLogger);

  // Routes — health check bypasses tenant resolution
  app.use('/health', healthRoutes);

  // All API routes require a resolved tenant
  app.use('/api/v1', tenantResolver);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/rides', rideRoutes);
  app.use('/api/v1/drivers', driverRoutes);
  app.use('/api/v1/billing', billingRoutes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist.',
    });
  });

  // Central error handler — must be last
  app.use(errorHandler);

  return app;
}
