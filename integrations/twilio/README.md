# Twilio Integration

Twilio is used for SMS notifications and phone verification.

## SMS Notifications

| Template | Trigger |
|----------|---------|
| `otp_verification` | Phone verification on registration |
| `driver_assigned` | Driver on the way (for passengers without push) |
| `ride_completed` | Trip summary with fare |
| `refund_initiated` | Refund confirmation |

## Configuration

```
TWILIO_ACCOUNT_SID=ACxxxxxxx
TWILIO_AUTH_TOKEN=<auth-token>
TWILIO_FROM_NUMBER=+1800TAGMYTX
```

Per tenant, configure `smsSenderId` in `tenant.config.json` to use the tenant's own alphanumeric sender ID (where supported by the recipient country).

## Rate Limiting

The notification service internally rate-limits Twilio calls to:
- Max 1 SMS per passenger per event type per 5 minutes
- Max 10 SMS per passenger per hour

This prevents cost overruns from retry loops and protects against SMS flooding attacks.
