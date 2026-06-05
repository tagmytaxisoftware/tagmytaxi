# End-to-End Tests

End-to-end tests use **Playwright** for the web app and **Detox** for mobile apps.

## Setup

```bash
# Web E2E (Playwright)
npm install --save-dev @playwright/test
npx playwright install

# Run against staging
PLAYWRIGHT_BASE_URL=https://staging.tagmytaxi.ae npx playwright test
```

## Test Scenarios

### Passenger Web App (`testing/e2e/web/`)

| Scenario | File |
|----------|------|
| Successful ride request and driver assignment | `ride-booking.spec.ts` |
| Cancellation before driver arrives | `ride-cancel.spec.ts` |
| Payment processing and receipt | `payment.spec.ts` |
| Authentication — login, logout, token refresh | `auth.spec.ts` |
| Multi-language — Arabic RTL layout | `i18n.spec.ts` |

### Driver App (`testing/e2e/mobile/driver/`)

| Scenario | File |
|----------|------|
| Go online / offline toggle | `online-toggle.spec.ts` |
| Accept a ride request | `ride-accept.spec.ts` |
| Complete a trip | `ride-complete.spec.ts` |

## CI Integration

E2E tests run on every PR to `develop` branch in the `ci.yml` workflow.
Mobile E2E tests run on the nightly `e2e-mobile.yml` workflow against real iOS/Android simulators via AWS Device Farm.
