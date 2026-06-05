/**
 * @fileoverview Mock billing service for testing and demos.
 * Returns plausible fare estimates based on simple distance/time formulas.
 * Not suitable for production use.
 */

import type { FareBreakdown, PricingRule } from '@tagmytaxi/shared';
import type { RideDetails } from '@tagmytaxi/shared';
import {
  AbstractBillingService,
  type BillingServiceConfig,
  type BillingDependencies,
} from './AbstractBillingService';

export class MockBillingService extends AbstractBillingService {
  constructor(config: BillingServiceConfig, deps: BillingDependencies) {
    super(config, deps);
  }

  protected async doGetSurgeMultiplier(_rideDetails: RideDetails): Promise<number> {
    // Return a realistic surge between 1.0 and 1.5 for demo purposes
    return 1.0 + Math.random() * 0.5;
  }

  protected doCalculateBreakdown(
    rideDetails: RideDetails,
    rule: PricingRule,
    surgeMultiplier: number,
  ): FareBreakdown {
    const distanceKm = rideDetails.distanceMeters / 1000;
    const durationMinutes = rideDetails.durationSeconds / 60;
    const waitMinutes = rideDetails.waitTimeSeconds / 60;

    const baseFare = rule.baseFare;
    const distanceFare = distanceKm * rule.perKmRate;
    const timeFare = durationMinutes * rule.perMinuteRate;
    // First 3 minutes of wait are free
    const waitTimeFare = Math.max(0, waitMinutes - 3) * 0.5;
    const subtotal = baseFare + distanceFare + timeFare + waitTimeFare;

    const surgeFare = subtotal * (surgeMultiplier - 1);
    const airportSurcharge = rideDetails.isAirportRide ? rule.airportSurcharge : 0;
    const nightTimeSurcharge = rideDetails.isNightTime
      ? subtotal * (rule.nightTimeSurchargePercent / 100)
      : 0;

    const taxableAmount = subtotal + surgeFare + airportSurcharge + nightTimeSurcharge;
    const platformFee = taxableAmount * (this.config.platformFeePercent / 100);
    const taxes = (taxableAmount + platformFee) * (this.config.taxPercent / 100);

    return {
      baseFare,
      distanceFare: parseFloat(distanceFare.toFixed(2)),
      timeFare: parseFloat(timeFare.toFixed(2)),
      waitTimeFare: parseFloat(waitTimeFare.toFixed(2)),
      surgeFare: parseFloat(surgeFare.toFixed(2)),
      airportSurcharge,
      nightTimeSurcharge: parseFloat(nightTimeSurcharge.toFixed(2)),
      taxes: parseFloat(taxes.toFixed(2)),
      platformFee: parseFloat(platformFee.toFixed(2)),
    };
  }
}
