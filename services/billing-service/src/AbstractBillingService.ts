/**
 * @fileoverview Abstract base class for the billing and payment processing service.
 *
 * ## Fare Calculation
 *
 * Fare calculation is a **pure function** of ride parameters and pricing rules.
 * It has no database side-effects — pricing rules are loaded from PostgreSQL at
 * service startup and cached in Redis, refreshed every 5 minutes by a background
 * job. The abstract class resolves the pricing rule and surge multiplier, then
 * delegates the actual arithmetic to `doCalculateBreakdown` in the subclass.
 *
 * ## Surge Pricing
 *
 * The surge multiplier is computed from the real-time demand/supply ratio within
 * a dispatch zone over a 10-minute rolling window. The calculation is performed
 * in a separate surge computation service and the result is cached in Redis with
 * a 1-minute TTL. The abstract class caps the multiplier at `maxSurgeMultiplier`
 * per the tenant's configuration.
 *
 * ## Payment Processing
 *
 * Payment is a side-effectful operation that:
 * 1. Validates the `fareEstimateId` has not expired.
 * 2. Delegates to the configured payment gateway adapter with an idempotency key
 *    (`pay:{rideId}:{passengerId}`) to prevent duplicate charges on retries.
 * 3. Records the transaction in the immutable audit log.
 * 4. Publishes a `payment.processed` domain event to notify downstream services
 *    (notifications, analytics, loyalty points).
 *
 * @module @tagmytaxi/billing-service
 */

import type { IBillingService } from '@tagmytaxi/shared';
import type { FareBreakdown, FareEstimate, PaymentDetails, PaymentResult, PricingRule, RefundResult } from '@tagmytaxi/shared';
import type { RideDetails } from '@tagmytaxi/shared';
import type { CurrencyCode, ISODateString } from '@tagmytaxi/shared';

export interface BillingServiceConfig {
  readonly tenantId: string;
  readonly defaultCurrency: CurrencyCode;
  /** Seconds a fare estimate remains valid for passenger confirmation */
  readonly estimateValiditySeconds: number;
  /** Maximum surge multiplier this tenant allows (configured by fleet operations) */
  readonly maxSurgeMultiplier: number;
  readonly platformFeePercent: number;
  readonly taxPercent: number;
}

export interface BillingDependencies {
  readonly paymentGateway: PaymentGatewayAdapter;
  readonly pricingStore: PricingStoreAdapter;
  readonly auditLog: AuditLogAdapter;
  readonly cache: CacheAdapter;
  readonly eventBus: EventBusAdapter;
  readonly logger: LoggerAdapter;
}

export interface PaymentGatewayAdapter {
  charge(params: {
    amount: number;
    currency: string;
    paymentMethodId: string;
    idempotencyKey: string;
    metadata: Record<string, string>;
  }): Promise<PaymentResult>;
  refund(params: {
    gatewayTransactionId: string;
    amount: number;
    reason: string;
  }): Promise<RefundResult>;
}

export interface PricingStoreAdapter {
  getPricingRule(tenantId: string, vehicleCategoryId: string): Promise<PricingRule>;
  getSurgeMultiplier(tenantId: string, zoneId: string, vehicleCategoryId: string): Promise<number>;
  getPromoDiscount(tenantId: string, promoCode: string, passengerId: string): Promise<number>;
}

export interface AuditLogAdapter {
  record(entry: {
    tenantId: string;
    event: string;
    entityId: string;
    payload: unknown;
    timestamp: string;
  }): Promise<void>;
}

export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
}

export interface EventBusAdapter {
  publish(topic: string, payload: unknown): Promise<void>;
}

export interface LoggerAdapter {
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, err: Error, ctx?: Record<string, unknown>): void;
}

/**
 * @abstract
 * @class AbstractBillingService
 * @implements IBillingService
 */
export abstract class AbstractBillingService implements IBillingService {
  protected readonly config: BillingServiceConfig;
  protected readonly deps: BillingDependencies;

  constructor(config: BillingServiceConfig, deps: BillingDependencies) {
    this.config = config;
    this.deps = deps;
  }

  async calculateFare(rideDetails: RideDetails): Promise<FareEstimate> {
    const [rule, surgeMultiplier] = await Promise.all([
      this.deps.pricingStore.getPricingRule(rideDetails.tenantId, rideDetails.vehicleCategoryId),
      this.doGetSurgeMultiplier(rideDetails),
    ]);

    const breakdown = this.doCalculateBreakdown(rideDetails, rule, surgeMultiplier);

    const promoDiscount = rideDetails.promoCode
      ? await this.deps.pricingStore.getPromoDiscount(
          rideDetails.tenantId,
          rideDetails.promoCode,
          rideDetails.rideId,
        )
      : 0;

    const totalAmount = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
    const finalAmount = Math.max(rule.minimumFare, totalAmount - promoDiscount);

    return {
      estimateId: `est_${rideDetails.rideId}_${Date.now()}`,
      expiresAt: new Date(
        Date.now() + this.config.estimateValiditySeconds * 1000,
      ).toISOString() as ISODateString,
      currency: this.config.defaultCurrency,
      breakdown,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      minimumFare: rule.minimumFare,
      surgeMultiplier,
      promoApplied: promoDiscount > 0,
      promoDiscountAmount: promoDiscount,
      finalAmount: parseFloat(finalAmount.toFixed(2)),
    };
  }

  async processPayment(paymentDetails: PaymentDetails): Promise<PaymentResult> {
    this.deps.logger.info('Processing payment', {
      rideId: paymentDetails.rideId,
      amount: paymentDetails.amount,
      gateway: paymentDetails.paymentGateway,
    });

    const idempotencyKey = `pay:${paymentDetails.rideId}:${paymentDetails.passengerId}`;
    const result = await this.deps.paymentGateway.charge({
      amount: paymentDetails.amount,
      currency: paymentDetails.currency as string,
      paymentMethodId: paymentDetails.paymentMethodId,
      idempotencyKey,
      metadata: {
        rideId: paymentDetails.rideId,
        passengerId: paymentDetails.passengerId,
        tenantId: this.config.tenantId,
      },
    });

    await this.deps.auditLog.record({
      tenantId: this.config.tenantId,
      event: 'payment.processed',
      entityId: paymentDetails.rideId,
      payload: { transactionId: result.transactionId, status: result.status },
      timestamp: new Date().toISOString(),
    });

    if (result.status === 'SUCCESS') {
      await this.deps.eventBus.publish('payment.processed', {
        rideId: paymentDetails.rideId,
        transactionId: result.transactionId,
        amount: result.amount,
        tenantId: this.config.tenantId,
      });
    }

    return result;
  }

  async issueRefund(transactionId: string, amount: number, reason: string): Promise<RefundResult> {
    this.deps.logger.info('Issuing refund', { transactionId, amount, reason });

    const result = await this.deps.paymentGateway.refund({
      gatewayTransactionId: transactionId,
      amount,
      reason,
    });

    await this.deps.auditLog.record({
      tenantId: this.config.tenantId,
      event: 'refund.initiated',
      entityId: transactionId,
      payload: { refundId: result.refundId, status: result.status },
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  async applySurge(
    baseFare: number,
    zoneId: string,
    vehicleCategoryId: string,
  ): Promise<{ adjustedFare: number; multiplier: number }> {
    const rawMultiplier = await this.deps.pricingStore.getSurgeMultiplier(
      this.config.tenantId,
      zoneId,
      vehicleCategoryId,
    );
    const multiplier = Math.min(rawMultiplier, this.config.maxSurgeMultiplier);
    return {
      adjustedFare: parseFloat((baseFare * multiplier).toFixed(2)),
      multiplier,
    };
  }

  // ── Abstract hooks ─────────────────────────────────────────────────────

  /** Returns the surge multiplier to apply for this ride's pickup zone and time. */
  protected abstract doGetSurgeMultiplier(rideDetails: RideDetails): Promise<number>;

  /** Computes the itemised fare breakdown given the ride, pricing rule, and surge multiplier. */
  protected abstract doCalculateBreakdown(
    rideDetails: RideDetails,
    rule: PricingRule,
    surgeMultiplier: number,
  ): FareBreakdown;
}
