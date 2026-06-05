/**
 * @fileoverview Mock implementation of the matching service.
 * Returns plausible fake data for development, testing, and demos.
 * Not suitable for production use.
 */

import type { Driver, ETAResult } from '@tagmytaxi/shared';
import type { Coordinate } from '@tagmytaxi/shared';
import type { RideRequest } from '@tagmytaxi/shared';
import {
  AbstractMatchingService,
  type MatchingServiceConfig,
  type MatchingDependencies,
} from './AbstractMatchingService';

export class MockMatchingService extends AbstractMatchingService {
  constructor(config: MatchingServiceConfig, deps: MatchingDependencies) {
    super(config, deps);
  }

  protected doScoreDriver(driver: Driver, _request: RideRequest, distanceKm: number): number {
    // Weighted score: 50% rating, 30% proximity, 20% trip count experience
    const ratingScore = driver.rating / 5;
    const proximityScore = Math.max(0, 1 - distanceKm / 10);
    const experienceScore = Math.min(1, driver.totalTrips / 500);
    return 0.5 * ratingScore + 0.3 * proximityScore + 0.2 * experienceScore;
  }

  protected async doCalculateETA(
    origin: Coordinate,
    destination: Coordinate,
  ): Promise<ETAResult> {
    // Simulate ~30km/h average speed for urban Dubai conditions
    const latDiff = Math.abs(destination.lat - origin.lat);
    const lngDiff = Math.abs(destination.lng - origin.lng);
    const approximateDistanceKm = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
    const durationSeconds = Math.max(120, Math.round((approximateDistanceKm / 30) * 3600));

    return {
      durationSeconds,
      distanceMeters: Math.round(approximateDistanceKm * 1000),
      trafficAware: false,
      confidence: 'low',
      calculatedAt: new Date().toISOString() as import('@tagmytaxi/shared').ISODateString,
    };
  }
}
