# ADR-002: Microservices Architecture for Core Operational Services

**Status:** Accepted  
**Date:** 2024-03-15  
**Deciders:** Platform Engineering, VP Engineering

## Context

The three core operational loops — ride-driver matching, real-time GPS tracking, and fare/billing — have fundamentally different scalability profiles:

| Service | Bottleneck | Peak Load Characteristic |
|---------|-----------|--------------------------|
| Matching | CPU (scoring algorithm) | Burst during peak booking hours |
| Tracking | I/O (Redis Pub/Sub) | Sustained throughput from driver fleet |
| Billing | Payment gateway latency | Spiky, tied to ride completions |

## Decision

Extract matching, tracking, and billing into **independent, deployable microservices** with their own process, scaling group, and resource allocation.

The REST API (`packages/api`) acts as an orchestration layer, calling these services via internal network. The services communicate asynchronously via domain events on an event bus (AWS EventBridge in production).

## Rationale

1. **Independent scaling** — Matching can scale horizontally during morning/evening peaks without scaling the tracking infrastructure. Tracking can optimise for memory (Redis Pub/Sub connections) while billing optimises for payment gateway connection pooling.
2. **Isolated deployment risk** — A billing service bug does not affect real-time tracking. Canary deployments can be targeted per-service.
3. **Technology optionality** — The matching service can be rewritten in Rust or Go for performance gains without touching the tracking or billing code.
4. **Interface contract enforcement** — The `IMatchingService`, `ITrackingService`, `IBillingService` interfaces in `@tagmytaxi/shared` form a stable contract. The API layer only depends on interfaces, not implementations.

## Consequences

- Each service has its own `package.json`, `tsconfig.json`, `Dockerfile`, and Kubernetes deployment.
- Services are deployed to separate ECS task definitions with separate autoscaling policies.
- Inter-service communication uses domain events for non-blocking operations and direct HTTP calls (with circuit breakers) for synchronous operations (e.g. fare estimate required before confirming a ride).
- The abstract base classes in each service package act as the standard framework within which any new implementation must fit.
