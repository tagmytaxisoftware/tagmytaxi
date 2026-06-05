# Stripe Integration

Stripe is the primary payment gateway for international markets. The platform uses:

- **Payment Intents API** for card-present and card-not-present charges
- **SetupIntents API** for saving payment methods (tokenisation)
- **Refunds API** for full and partial refunds
- **Webhooks** for asynchronous payment event confirmation

## Configuration

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_API_VERSION=2024-02-15
```

## Idempotency

All charge requests include an idempotency key (`pay:{rideId}:{passengerId}`) preventing duplicate charges on network retries.

## Webhook Events Handled

| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Mark transaction as SUCCESS, notify passenger |
| `payment_intent.payment_failed` | Mark transaction as FAILED, notify passenger |
| `charge.refunded` | Mark refund as PROCESSED, update ledger |

## PCI Compliance

No raw card data transits our servers. All card collection uses Stripe Elements (web) and Stripe SDK (mobile). The platform is SAQ-A compliant.
