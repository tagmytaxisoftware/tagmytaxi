/**
 * @fileoverview Billing service interface — the contract for fare calculation
 * and payment processing.
 *
 * **Fare Calculation** is a pure, side-effect-free computation given ride
 * parameters (distance, duration, wait time, zone) and the tenant's pricing
 * rules. Pricing rules are loaded from PostgreSQL at startup and refreshed
 * every 5 minutes via a background job, cached in Redis.
 *
 * **Surge pricing** applies a real-time demand multiplier calculated from the
 * ratio of ride requests to available drivers within a zone, smoothed over a
 * 10-minute rolling window. The multiplier is capped at the tenant's
 * `maxSurgeMultiplier` setting.
 *
 * **Payment processing** is delegated to the configured payment gateway adapter
 * (Stripe, PayPal, Tap, Telr). The billing service manages idempotency keys,
 * retries, and the payment audit trail independently of the gateway.
 *
 * @module @tagmytaxi/shared/interfaces
 */

import type { FareEstimate, PaymentDetails, PaymentResult, RefundResult } from '../types/billing';
import type { RideDetails } from '../types/ride';

/**
 * Contract for the billing and payment processing service.
 */
export interface IBillingService {
  /**
   * Computes a fare estimate for a prospective ride.
   * This is a read-only operation — it does not create any records.
   *
   * The estimate includes a full itemised breakdown and is valid for
   * `estimateValiditySeconds` seconds (configurable per tenant). Passengers
   * must confirm the ride within this window; expired estimates are rejected
   * by `processPayment`.
   *
   * @param rideDetails - Completed trip data including distance, duration, and zones.
   * @returns A fare estimate with itemised breakdown, surge multiplier, and promo discount.
   */
  calculateFare(rideDetails: RideDetails): Promise<FareEstimate>;

  /**
   * Charges the passenger's payment method for a completed ride.
   *
   * Before charging:
   * 1. Validates the `fareEstimateId` has not expired.
   * 2. Checks the estimate amount matches the `paymentDetails.amount` (±10% tolerance for surge).
   * 3. Generates an idempotency key (`pay:{rideId}:{passengerId}`) to prevent duplicate charges.
   *
   * On success, publishes a `payment.processed` domain event and records the transaction
   * in the audit log.
   *
   * @param paymentDetails - Payment parameters including gateway, method ID, and amount.
   * @returns Payment result with transaction ID and gateway status.
   * @throws {FareEstimateExpiredError} if the estimate has expired.
   * @throws {DuplicatePaymentError} if a successful payment already exists for this ride.
   */
  processPayment(paymentDetails: PaymentDetails): Promise<PaymentResult>;

  /**
   * Initiates a full or partial refund for a previously processed payment.
   *
   * Refunds are processed asynchronously by the payment gateway. The service
   * records the refund initiation immediately and publishes a `refund.initiated`
   * event. A webhook from the gateway confirms the final status.
   *
   * @param transactionId - The internal transaction ID of the payment to refund.
   * @param amount - Amount to refund in the original transaction currency.
   * @param reason - Standardised reason code (e.g. `'passenger_request'`, `'driver_no_show'`).
   * @returns Refund result with expected completion date.
   * @throws {TransactionNotFoundError} if no successful payment exists for `transactionId`.
   */
  issueRefund(transactionId: string, amount: number, reason: string): Promise<RefundResult>;

  /**
   * Applies real-time surge pricing to a base fare.
   *
   * @param baseFare - The pre-surge fare amount.
   * @param zoneId - The dispatch zone to calculate surge for.
   * @param vehicleCategoryId - Vehicle category (surge multipliers vary by category).
   * @returns Adjusted fare and the surge multiplier applied.
   */
  applySurge(
    baseFare: number,
    zoneId: string,
    vehicleCategoryId: string,
  ): Promise<{ adjustedFare: number; multiplier: number }>;
}
