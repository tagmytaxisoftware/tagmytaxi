# ADR-001: Monorepo vs Polyrepo

**Status:** Accepted  
**Date:** 2024-03-01  
**Deciders:** Platform Engineering Lead, CTO

## Context

The TagMyTaxi platform comprises 5 frontend applications (web-app, admin-panel, dispatcher-panel, passenger-app, driver-app) and 3 backend services (matching, tracking, billing), all sharing a common domain model via `@tagmytaxi/shared`.

We need to decide whether to develop these in a single repository (monorepo) or separate repositories (polyrepo).

## Decision

We will use a **Turborepo monorepo** managed via npm workspaces.

## Rationale

### Arguments for Monorepo

1. **Atomic cross-package changes** — updating `@tagmytaxi/shared` types and all consumers simultaneously in a single PR eliminates the "pending package version" coordination overhead.
2. **Shared type safety** — `@tagmytaxi/shared` exports TypeScript interfaces that are consumed verbatim by API, services, and frontends. With a monorepo, breakages are caught at CI time before they reach main.
3. **Unified CI** — a single Turborepo pipeline runs lint, typecheck, test, and build with caching, reducing total CI time from ~45 minutes (polyrepo, parallel) to ~8 minutes (monorepo, cached).
4. **Simplified onboarding** — one `git clone`, one `npm install`, one command to start the full stack.

### Arguments Against Monorepo (Rejected)

1. **Separate deploy cadences** — Services need to deploy independently. **Mitigation:** Turborepo's pipeline respects package boundaries; CI filters jobs to changed packages via `--filter`.
2. **Repository size** — With mobile apps, the repo could grow large. **Mitigation:** Mobile build artefacts are in `.gitignore`; Turborepo remote caching avoids rebuilding unchanged packages.
3. **Access control** — Partners may need read access to web-app without access to billing. **Mitigation:** Use branch protection and path-based CODEOWNERS.

## Consequences

- All packages share a common `.nvmrc`, root `tsconfig.json`, ESLint config, and Prettier config.
- `turbo.json` defines the build pipeline with proper `dependsOn` chains.
- Package names follow the `@tagmytaxi/<name>` convention.
- `packages/shared` must always build before any other package — enforced by Turborepo's DAG.
