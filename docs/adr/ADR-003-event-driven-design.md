# ADR-003: Event-Driven Design for Cross-Service Communication

**Status:** Accepted  
**Date:** 2024-04-01  
**Deciders:** Platform Engineering, Architecture Review Board

## Context

Multiple platform services need to react to state changes in the ride lifecycle:
- Notifications service must send push/SMS on `ride.driver_assigned`
- Analytics service must record on `ride.completed`
- Loyalty service must award points on `payment.processed`
- Billing service must be triggered on `ride.completed`

A synchronous call chain (API → Billing → Notifications → Analytics → Loyalty) creates fragility: one slow service blocks the entire chain.

## Decision

Adopt **event-driven architecture** using domain events published to an event bus (AWS EventBridge). Consuming services subscribe to events relevant to their domain and process them independently.

## Domain Events

| Event | Publisher | Subscribers |
|-------|---------|------------|
| `ride.requested` | API | Matching |
| `ride.driver_assigned` | Matching | Notifications, Tracking |
| `ride.in_progress` | API | Tracking, Analytics |
| `ride.completed` | API | Billing, Analytics, Notifications |
| `payment.processed` | Billing | Notifications, Loyalty, Analytics |
| `refund.initiated` | Billing | Notifications, Finance |
| `driver.released` | Matching | Driver status cache |

## Event Schema

All events follow a standard envelope:

```typescript
interface DomainEvent<T = unknown> {
  eventId: string;       // UUID v4
  eventType: string;     // Dot-separated e.g. "ride.completed"
  aggregateId: string;   // Entity ID the event concerns
  tenantId: string;      // Tenant isolation
  version: number;       // Event schema version for forward compatibility
  occurredAt: string;    // ISO 8601
  payload: T;
}
```

## Consequences

- Services become loosely coupled — a notification service failure does not prevent billing.
- Each service handles its own idempotency (duplicate event delivery is expected; consumers must be idempotent).
- Event schemas are versioned; breaking changes require a new event type rather than modifying the existing schema.
- A dead letter queue (DLQ) catches failed event deliveries for manual inspection.
- The abstract service base classes expose `EventBusAdapter` as a dependency injection point, enabling in-memory event buses during unit testing.
