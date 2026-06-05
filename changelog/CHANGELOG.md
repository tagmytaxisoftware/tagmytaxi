# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [2.0.0] — 2026-06-01

### Added
- Full monorepo restructure with Turborepo and npm workspaces
- `packages/shared` — cross-package TypeScript types, interfaces, constants, utilities
- `services/matching-service` — abstract base + mock implementation with full Jest suite
- `services/tracking-service` — abstract base + mock implementation with full Jest suite
- `services/billing-service` — abstract base + mock implementation with full Jest suite
- `tenant.config.json` + `tenant.config.schema.json` — multi-tenant configuration layer
- `packages/api` — Express.js REST API with Socket.IO tracking gateway
- `packages/web-app` — Next.js 14 passenger web app with Redux Toolkit
- `packages/admin-panel` — Next.js 14 admin dashboard
- `packages/dispatcher-panel` — Real-time dispatch console
- `packages/passenger-app` — React Native passenger app scaffold
- `packages/driver-app` — React Native driver app scaffold
- `deployment/` — Docker, Kubernetes (Kustomize), Terraform (AWS ECS Fargate + RDS + ElastiCache)
- `database/` — PostgreSQL schema migrations with PostGIS, partitioned tables, optimised indexes
- `docs/` — Architecture decision records (ADR-001 through ADR-003), system overview, OpenAPI 3.1 spec
- `security/` — SECURITY.md responsible disclosure policy, STRIDE threat model
- `testing/` — k6 load test, Postman collection, E2E test documentation
- `.github/workflows/` — CI (lint + test + build), deploy-staging (ECS), security-scan (CodeQL + audit)
- Husky pre-commit hooks with commitlint (Conventional Commits)
- ESLint (`@typescript-eslint/recommended`), Prettier, TypeScript strict mode

### Changed
- Replaced flat directory structure with proper monorepo workspace layout
- Updated README.md with full technical documentation

### Security
- Implemented RBAC with `Permission` enum and `requirePermission` middleware
- JWT authentication with 15-minute access token TTL and server-side refresh token revocation
- Tenant isolation enforced at middleware, service, and database levels

## [1.1.0] — 2026-06-04

### Changed
- Updated support contact link in README.md

## [1.0.0] — 2026-05-19

### Added
- Initial repository with README.md product documentation
