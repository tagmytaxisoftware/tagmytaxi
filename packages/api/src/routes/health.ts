/**
 * @fileoverview Health check endpoint.
 * Used by Docker, Kubernetes liveness/readiness probes, and the ALB target group.
 */

import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    version: process.env['npm_package_version'] ?? 'unknown',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', (_req, res) => {
  // In production: check DB and Redis connectivity before returning 200
  res.json({ status: 'ready' });
});

export default router;
