/**
 * @fileoverview Tenant resolution middleware.
 * Reads X-Tenant-Id header, validates against the tenant registry,
 * and attaches the tenant config to req.tenant.
 */

import type { NextFunction, Request, Response } from 'express';
import type { TenantConfig } from '@tagmytaxi/shared';

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantConfig;
    }
  }
}

/** Stub: in production this queries Redis then PostgreSQL */
async function resolveTenant(tenantId: string): Promise<TenantConfig | null> {
  // Production: check Redis cache first, fall back to DB
  const knownTenants = ['cityride-dubai', 'test-tenant', 'demo-tenant'];
  if (!knownTenants.includes(tenantId)) return null;

  return {
    tenantId: tenantId as import('@tagmytaxi/shared').TenantId,
    brandName: 'TagMyTaxi Demo',
    primaryColor: '#E8000E',
    logoUrl: 'https://cdn.tagmytaxi.ae/logo.png',
    supportedLocales: ['en-US', 'ar-AE'],
    defaultLocale: 'en-US',
    currency: 'AED' as import('@tagmytaxi/shared').CurrencyCode,
    timezone: 'Asia/Dubai',
    mapProvider: 'google',
    enabledFeatures: {
      scheduledRides: true,
      rideSharing: false,
      corporateAccounts: true,
      loyaltyProgram: true,
      surgeNotifications: true,
      driverTipping: true,
      rideTracking: true,
      liveChat: false,
      sos: true,
      rideHistory: true,
      receipts: true,
      multipleStops: false,
    },
    paymentGateways: ['stripe'],
    vehicleCategories: ['economy', 'comfort', 'suv', 'xl'],
    notificationChannels: ['push', 'sms', 'email'],
    smsSenderId: 'TAGMYTAXI',
    supportEmail: 'support@tagmytaxi.ae',
    rbac: {
      roles: ['PASSENGER', 'DRIVER', 'DISPATCHER', 'FLEET_MANAGER', 'ADMIN'],
      customPermissions: [],
    },
    slaTargets: {
      driverAssignmentMaxSeconds: 30,
      minimumDriverRating: 3.5,
      initialSearchRadiusKm: 5,
      maxSearchExpansions: 3,
    },
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  };
}

/**
 * Resolves the active tenant from the `X-Tenant-Id` request header.
 * Returns 400 if the header is missing, 403 if the tenant is unknown or inactive.
 */
export async function tenantResolver(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const tenantId = req.headers['x-tenant-id'] as string | undefined;

  if (!tenantId) {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'X-Tenant-Id header is required.' });
    return;
  }

  const tenant = await resolveTenant(tenantId);

  if (!tenant) {
    res.status(403).json({ code: 'TENANT_NOT_FOUND', message: `Tenant '${tenantId}' not found.` });
    return;
  }

  if (!tenant.isActive) {
    res.status(403).json({ code: 'TENANT_INACTIVE', message: `Tenant '${tenantId}' is inactive.` });
    return;
  }

  req.tenant = tenant;
  next();
}
