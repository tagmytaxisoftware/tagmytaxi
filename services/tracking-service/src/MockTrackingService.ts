/**
 * @fileoverview Mock implementation of the tracking service.
 * Simulates location updates and subscriptions for development and testing.
 * Not suitable for production use.
 */

import type { Coordinate, LocationUpdate } from '@tagmytaxi/shared';
import type { DriverId, RideId, TenantId } from '@tagmytaxi/shared';
import {
  AbstractTrackingService,
  type TrackingServiceConfig,
  type TrackingDependencies,
} from './AbstractTrackingService';

export class MockTrackingService extends AbstractTrackingService {
  /** In-memory last-known-location store */
  private readonly locationStore = new Map<string, Coordinate>();

  constructor(config: TrackingServiceConfig, deps: TrackingDependencies) {
    super(config, deps);
  }

  protected async doStoreLastKnownLocation(update: LocationUpdate): Promise<void> {
    this.locationStore.set(update.driverId, {
      lat: update.coordinate.lat,
      lng: update.coordinate.lng,
    });
  }

  protected async doGetLastKnownLocation(driverId: DriverId): Promise<Coordinate | null> {
    return this.locationStore.get(driverId) ?? null;
  }

  protected async doGetDriversInArea(
    center: Coordinate,
    radiusKm: number,
    _tenantId: TenantId,
  ): Promise<ReadonlyArray<{ driverId: DriverId; location: Coordinate; bearing: number }>> {
    // Return 3–5 mock drivers scattered around the center point (Dubai area)
    const count = 3 + Math.floor(Math.random() * 3);
    return Array.from({ length: count }, (_, i) => ({
      driverId: `mock-driver-${i + 1}` as DriverId,
      location: {
        lat: center.lat + (Math.random() - 0.5) * (radiusKm / 111),
        lng: center.lng + (Math.random() - 0.5) * (radiusKm / 111),
      },
      bearing: Math.floor(Math.random() * 360),
    }));
  }

  protected async doGetTripPath(rideId: RideId): Promise<ReadonlyArray<Coordinate>> {
    // Return a plausible 20-point path within Dubai
    void rideId;
    return Array.from({ length: 20 }, (_, i) => ({
      lat: 25.2048 + i * 0.001,
      lng: 55.2708 + i * 0.0008,
    }));
  }
}
