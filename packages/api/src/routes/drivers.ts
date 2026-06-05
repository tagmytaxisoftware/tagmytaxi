/**
 * @fileoverview Drivers router.
 * GET /          — list drivers (fleet manager / admin)
 * GET /:id       — get driver profile
 * PATCH /:id/status — update driver online status
 */

import { Router } from 'express';
import { Permission } from '@tagmytaxi/shared';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission(Permission.DRIVER_READ), async (req, res, next) => {
  try {
    res.json({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      hasNextPage: false,
      hasPrevPage: false,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:driverId', requirePermission(Permission.DRIVER_READ), async (req, res, next) => {
  try {
    const { driverId } = req.params;
    res.json({
      driverId,
      firstName: 'Ahmed',
      lastName: 'Al Rashidi',
      status: 'AVAILABLE',
      rating: 4.8,
      totalTrips: 1250,
      vehicleCategoryId: 'economy',
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:driverId/status', authenticate, async (req, res, next) => {
  try {
    const { driverId } = req.params;
    const { status } = req.body as { status?: string };
    res.json({ driverId, status, updatedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

export default router;
