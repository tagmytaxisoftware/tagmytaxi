# Firebase Integration

Firebase Cloud Messaging (FCM) is used for push notifications to the passenger and driver apps.

## Notification Types

| Template | Trigger | Recipients |
|----------|---------|-----------|
| `driver_assigned` | Driver accepts ride | Passenger |
| `driver_arrived` | Driver marks arrival | Passenger |
| `ride_completed` | Trip ends | Both |
| `payment_processed` | Payment confirmed | Passenger |
| `new_ride_request` | Ride request in range | Driver |
| `surge_alert` | Surge > 1.5x in zone | Available drivers |

## Configuration

```
FIREBASE_PROJECT_ID=tagmytaxi-prod
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/secrets/firebase-service-account.json
```

Per tenant, set `firebaseProjectId` in `tenant.config.json` to route notifications to the tenant's dedicated Firebase project.

## Topic Subscriptions

Drivers subscribe to zone-based FCM topics (e.g. `zone-downtown-dubai-available`) so surge alerts can be delivered without enumerating individual device tokens.
