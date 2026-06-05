/**
 * @fileoverview Billing router.
 * POST /estimate — calculate fare estimate
 * POST /charge   — process payment for completed ride
 * POST /refund   — initiate refund
 */

import { Router } from 'express';
import { Permission } from '@tagmytaxi/shared';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

router.post('/estimate', requirePermission(Permission.RIDE_CREATE), async (req, res, next) => {
  try {
    res.json({
      estimateId: `est_${Date.now()}`,
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      currency: req.tenant?.currency ?? 'AED',
      finalAmount: 35.50,
      minimumFare: 10.00,
      surgeMultiplier: 1.0,
      breakdown: {
        baseFare: 5.00,
        distanceFare: 15.00,
        timeFare: 8.00,
        waitTimeFare: 0.00,
        surgeFare: 0.00,
        airportSurcharge: 0.00,
        nightTimeSurcharge: 0.00,
        taxes: 3.50,
        platformFee: 4.00,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/charge', requirePermission(Permission.BILLING_VIEW), async (req, res, next) => {
  try {
    res.json({
      transactionId: `txn_${Date.now()}`,
      status: 'SUCCESS',
      amount: 35.50,
      currency: req.tenant?.currency ?? 'AED',
      processedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refund', requirePermission(Permission.BILLING_REFUND), async (req, res, next) => {
  try {
    res.json({
      refundId: `re_${Date.now()}`,
      status: 'PENDING',
      initiatedAt: new Date().toISOString(),
      expectedCompletionAt: new Date(Date.now() + 86_400_000 * 5).toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
