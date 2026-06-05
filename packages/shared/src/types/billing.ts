/**
 * @fileoverview Billing, fare, and payment types for the TagMyTaxi platform.
 * @module @tagmytaxi/shared/types/billing
 */

import type { CurrencyCode, ISODateString, PassengerId, RideId, TenantId } from './common';

/**
 * Itemised breakdown of a fare calculation.
 * All values are in the tenant's default currency.
 */
export interface FareBreakdown {
  readonly baseFare: number;
  readonly distanceFare: number;
  readonly timeFare: number;
  readonly waitTimeFare: number;
  readonly surgeFare: number;
  readonly airportSurcharge: number;
  readonly nightTimeSurcharge: number;
  readonly taxes: number;
  readonly platformFee: number;
}

/**
 * Fare estimate returned to the passenger before trip confirmation.
 * Valid for {@link BillingServiceConfig.estimateValiditySeconds} seconds.
 */
export interface FareEstimate {
  readonly estimateId: string;
  readonly expiresAt: ISODateString;
  readonly currency: CurrencyCode;
  readonly breakdown: FareBreakdown;
  /** Sum of all breakdown items before promo */
  readonly totalAmount: number;
  readonly minimumFare: number;
  readonly surgeMultiplier: number;
  readonly promoApplied: boolean;
  readonly promoDiscountAmount: number;
  /** Final amount passenger will be charged */
  readonly finalAmount: number;
}

/**
 * Payment gateway identifiers supported by the platform.
 */
export type PaymentGateway = 'stripe' | 'paypal' | 'tap' | 'telr';

/**
 * Payment details submitted by the passenger when confirming a ride.
 */
export interface PaymentDetails {
  readonly rideId: RideId;
  readonly passengerId: PassengerId;
  readonly amount: number;
  readonly currency: CurrencyCode;
  readonly paymentMethodId: string;
  readonly paymentGateway: PaymentGateway;
  readonly fareEstimateId: string;
}

/**
 * Result of a payment charge attempt.
 */
export interface PaymentResult {
  readonly transactionId: string;
  readonly status: 'SUCCESS' | 'FAILED' | 'PENDING';
  readonly amount: number;
  readonly currency: CurrencyCode;
  readonly gatewayTransactionId: string;
  readonly gatewayStatus: string;
  readonly failureCode?: string;
  readonly failureMessage?: string;
  readonly processedAt: ISODateString;
}

/**
 * Result of a refund operation.
 */
export interface RefundResult {
  readonly refundId: string;
  readonly originalTransactionId: string;
  readonly amount: number;
  readonly currency: CurrencyCode;
  readonly status: 'PENDING' | 'PROCESSED' | 'FAILED';
  readonly reason: string;
  readonly initiatedAt: ISODateString;
  readonly expectedCompletionAt: ISODateString;
  readonly gatewayRefundId: string;
}

/**
 * Pricing rule loaded per tenant + vehicle category.
 */
export interface PricingRule {
  readonly tenantId: TenantId;
  readonly vehicleCategoryId: string;
  readonly currency: CurrencyCode;
  readonly baseFare: number;
  readonly perKmRate: number;
  readonly perMinuteRate: number;
  readonly minimumFare: number;
  readonly cancellationFee: number;
  readonly airportSurcharge: number;
  readonly nightTimeSurchargePercent: number;
  readonly nightTimeStartHour: number;
  readonly nightTimeEndHour: number;
  readonly effectiveFrom: ISODateString;
}
