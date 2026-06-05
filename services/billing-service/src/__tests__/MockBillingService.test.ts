import type { CurrencyCode, PaymentDetails, RideDetails, TenantId, ISODateString } from '@tagmytaxi/shared';
import { MockBillingService } from '../MockBillingService';
import type { BillingDependencies, BillingServiceConfig } from '../AbstractBillingService';

function makeConfig(): BillingServiceConfig {
  return {
    tenantId: 'test-tenant',
    defaultCurrency: 'AED' as CurrencyCode,
    estimateValiditySeconds: 300,
    maxSurgeMultiplier: 3.0,
    platformFeePercent: 20,
    taxPercent: 5,
  };
}

function makePricingRule() {
  return {
    tenantId: 'test-tenant' as TenantId,
    vehicleCategoryId: 'economy',
    currency: 'AED' as CurrencyCode,
    baseFare: 5.0,
    perKmRate: 1.5,
    perMinuteRate: 0.25,
    minimumFare: 10.0,
    cancellationFee: 5.0,
    airportSurcharge: 10.0,
    nightTimeSurchargePercent: 20,
    nightTimeStartHour: 23,
    nightTimeEndHour: 6,
    effectiveFrom: '2024-01-01T00:00:00.000Z' as ISODateString,
  };
}

function makeDeps(): BillingDependencies {
  return {
    paymentGateway: {
      charge: jest.fn().mockResolvedValue({
        transactionId: 'txn_test_123',
        status: 'SUCCESS',
        amount: 35.5,
        currency: 'AED' as CurrencyCode,
        gatewayTransactionId: 'pi_test_123',
        gatewayStatus: 'succeeded',
        processedAt: new Date().toISOString() as ISODateString,
      }),
      refund: jest.fn().mockResolvedValue({
        refundId: 're_test_123',
        originalTransactionId: 'txn_test_123',
        amount: 35.5,
        currency: 'AED' as CurrencyCode,
        status: 'PENDING',
        reason: 'passenger_request',
        initiatedAt: new Date().toISOString() as ISODateString,
        expectedCompletionAt: new Date().toISOString() as ISODateString,
        gatewayRefundId: 'ref_test_123',
      }),
    },
    pricingStore: {
      getPricingRule: jest.fn().mockResolvedValue(makePricingRule()),
      getSurgeMultiplier: jest.fn().mockResolvedValue(1.0),
      getPromoDiscount: jest.fn().mockResolvedValue(0),
    },
    auditLog: { record: jest.fn().mockResolvedValue(undefined) },
    cache: {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    },
    eventBus: { publish: jest.fn().mockResolvedValue(undefined) },
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  };
}

function makeRideDetails(overrides: Partial<RideDetails> = {}): RideDetails {
  return {
    rideId: 'ride-001' as import('@tagmytaxi/shared').RideId,
    tenantId: 'test-tenant' as TenantId,
    vehicleCategoryId: 'economy',
    distanceMeters: 10000,
    durationSeconds: 1200,
    waitTimeSeconds: 120,
    origin: { lat: 25.2048, lng: 55.2708, address: 'Dubai Mall' },
    destination: { lat: 25.1972, lng: 55.2797, address: 'Dubai International Airport T3' },
    ...overrides,
  };
}

describe('MockBillingService', () => {
  let service: MockBillingService;
  let deps: BillingDependencies;

  beforeEach(() => {
    deps = makeDeps();
    service = new MockBillingService(makeConfig(), deps);
  });

  describe('calculateFare', () => {
    it('returns a fare estimate with all required fields', async () => {
      const estimate = await service.calculateFare(makeRideDetails());
      expect(estimate.estimateId).toBeTruthy();
      expect(estimate.expiresAt).toBeTruthy();
      expect(estimate.currency).toBe('AED');
      expect(estimate.finalAmount).toBeGreaterThan(0);
      expect(estimate.breakdown).toHaveProperty('baseFare');
      expect(estimate.breakdown).toHaveProperty('distanceFare');
      expect(estimate.breakdown).toHaveProperty('taxes');
      expect(estimate.breakdown).toHaveProperty('platformFee');
    });

    it('finalAmount is at least the minimum fare', async () => {
      const shortRide = makeRideDetails({ distanceMeters: 100, durationSeconds: 30 });
      const estimate = await service.calculateFare(shortRide);
      expect(estimate.finalAmount).toBeGreaterThanOrEqual(estimate.minimumFare);
    });

    it('applies airport surcharge for airport rides', async () => {
      const estimate = await service.calculateFare(makeRideDetails({ isAirportRide: true }));
      expect(estimate.breakdown.airportSurcharge).toBe(10.0);
    });

    it('does not apply airport surcharge for non-airport rides', async () => {
      const estimate = await service.calculateFare(makeRideDetails({ isAirportRide: false }));
      expect(estimate.breakdown.airportSurcharge).toBe(0);
    });

    it('applies promo discount when promoCode is provided', async () => {
      (deps.pricingStore.getPromoDiscount as jest.Mock).mockResolvedValue(5.0);
      const estimate = await service.calculateFare(
        makeRideDetails({ promoCode: 'WELCOME10' }),
      );
      expect(estimate.promoApplied).toBe(true);
      expect(estimate.promoDiscountAmount).toBe(5.0);
    });

    it('fetches pricing rule and surge multiplier', async () => {
      await service.calculateFare(makeRideDetails());
      expect(deps.pricingStore.getPricingRule).toHaveBeenCalledWith('test-tenant', 'economy');
    });
  });

  describe('processPayment', () => {
    const paymentDetails: PaymentDetails = {
      rideId: 'ride-001' as import('@tagmytaxi/shared').RideId,
      passengerId: 'pax-001' as import('@tagmytaxi/shared').PassengerId,
      amount: 35.5,
      currency: 'AED' as CurrencyCode,
      paymentMethodId: 'pm_test_card',
      paymentGateway: 'stripe',
      fareEstimateId: 'est_ride-001_123',
    };

    it('calls the payment gateway and returns SUCCESS result', async () => {
      const result = await service.processPayment(paymentDetails);
      expect(result.status).toBe('SUCCESS');
      expect(result.transactionId).toBe('txn_test_123');
      expect(deps.paymentGateway.charge).toHaveBeenCalledTimes(1);
    });

    it('records the transaction in the audit log', async () => {
      await service.processPayment(paymentDetails);
      expect(deps.auditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'payment.processed', entityId: 'ride-001' }),
      );
    });

    it('publishes payment.processed domain event on success', async () => {
      await service.processPayment(paymentDetails);
      expect(deps.eventBus.publish).toHaveBeenCalledWith(
        'payment.processed',
        expect.objectContaining({ rideId: 'ride-001', transactionId: 'txn_test_123' }),
      );
    });

    it('does not publish event when payment fails', async () => {
      (deps.paymentGateway.charge as jest.Mock).mockResolvedValue({
        transactionId: 'txn_fail',
        status: 'FAILED',
        amount: 35.5,
        currency: 'AED',
        gatewayTransactionId: 'pi_fail',
        gatewayStatus: 'declined',
        failureCode: 'card_declined',
        processedAt: new Date().toISOString(),
      });
      await service.processPayment(paymentDetails);
      expect(deps.eventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('issueRefund', () => {
    it('calls the gateway refund and logs in audit', async () => {
      const result = await service.issueRefund('txn_test_123', 35.5, 'passenger_request');
      expect(result.status).toBe('PENDING');
      expect(result.refundId).toBe('re_test_123');
      expect(deps.auditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'refund.initiated', entityId: 'txn_test_123' }),
      );
    });
  });

  describe('applySurge', () => {
    it('returns the adjusted fare with surge multiplier', async () => {
      (deps.pricingStore.getSurgeMultiplier as jest.Mock).mockResolvedValue(1.5);
      const { adjustedFare, multiplier } = await service.applySurge(100, 'zone-downtown', 'economy');
      expect(multiplier).toBe(1.5);
      expect(adjustedFare).toBe(150);
    });

    it('caps multiplier at maxSurgeMultiplier', async () => {
      (deps.pricingStore.getSurgeMultiplier as jest.Mock).mockResolvedValue(5.0);
      const { multiplier } = await service.applySurge(100, 'zone-downtown', 'economy');
      expect(multiplier).toBe(3.0); // capped at config.maxSurgeMultiplier
    });
  });
});
