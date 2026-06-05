/**
 * @fileoverview Rides router.
 * POST /        — create ride request
 * GET  /:id     — get ride by ID
 * PATCH /:id/cancel — cancel a ride
 * GET  /:id/track   — SSE stream for live location updates
 */

import { Router } from 'express';

import { Permission } from '@tagmytaxi/shared';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

/** Create a new ride request */
router.post(
  '/',
  requirePermission(Permission.RIDE_CREATE),
  async (req, res, next) => {
    try {
      // Controller logic stubbed — production delegates to RideController
      const rideId = `ride_${Date.now()}`;
      res.status(202).json({
        rideId,
        status: 'PENDING',
        message: 'Ride request accepted. Searching for a driver...',
        estimatedWaitSeconds: 120,
      });
    } catch (err) {
      next(err);
    }
  },
);

/** Get ride details by ID */
router.get(
  '/:rideId',
  requirePermission(Permission.RIDE_READ),
  async (req, res, next) => {
    try {
      const { rideId } = req.params;
      res.json({
        rideId,
        status: 'PENDING',
        tenantId: req.tenant?.tenantId,
        pickup: { lat: 25.2048, lng: 55.2708, address: 'Dubai Mall' },
        dropoff: { lat: 25.1972, lng: 55.2797, address: 'Dubai Airport T3' },
        currency: 'AED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

/** Cancel a ride */
router.patch(
  '/:rideId/cancel',
  requirePermission(Permission.RIDE_CANCEL),
  async (req, res, next) => {
    try {
      const { rideId } = req.params;
      res.json({ rideId, status: 'CANCELLED', cancelledAt: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  },
);

/** Server-Sent Events stream for live driver location */
router.get('/:rideId/track', authenticate, (req, res) => {
  const { rideId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Simulate periodic location updates
  const interval = setInterval(() => {
    const location = { lat: 25.2048 + Math.random() * 0.01, lng: 55.2708 + Math.random() * 0.01 };
    res.write(`data: ${JSON.stringify({ rideId, location, timestamp: new Date().toISOString() })}\n\n`);
  }, 2000);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

export default router;
