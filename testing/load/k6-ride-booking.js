/**
 * k6 load test — Full ride booking flow
 * Simulates passengers authenticating, requesting rides, and cancelling.
 *
 * Run: k6 run --env BASE_URL=https://staging.tagmytaxi.ae testing/load/k6-ride-booking.js
 */

import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import http from 'k6/http';

// Custom metrics
const rideRequestDuration = new Trend('ride_request_duration', true);
const rideRequestErrors = new Counter('ride_request_errors');
const rideSuccessRate = new Rate('ride_success_rate');

export const options = {
  stages: [
    { duration: '1m',  target: 10  }, // Warm-up: ramp to 10 VUs
    { duration: '3m',  target: 100 }, // Ramp to 100 VUs
    { duration: '5m',  target: 300 }, // Sustain 300 VUs
    { duration: '3m',  target: 500 }, // Spike to 500 VUs (peak demand)
    { duration: '2m',  target: 100 }, // Scale back
    { duration: '1m',  target: 0   }, // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95th percentile < 500ms
    http_req_failed: ['rate<0.01'],                  // < 1% error rate
    ride_success_rate: ['rate>0.95'],                // > 95% ride requests succeed
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TENANT_ID = __ENV.TENANT_ID || 'demo-tenant';

const headers = {
  'Content-Type': 'application/json',
  'X-Tenant-Id': TENANT_ID,
};

function authenticate() {
  const response = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: `loadtest+${__VU}@tagmytaxi.ae`, password: 'LoadTest1234!' }),
    { headers, tags: { endpoint: 'auth_login' } },
  );
  check(response, { 'login 200': (r) => r.status === 200 });
  return response.json('accessToken');
}

function requestRide(token) {
  const authedHeaders = { ...headers, Authorization: `Bearer ${token}` };
  const start = Date.now();

  const response = http.post(
    `${BASE_URL}/api/v1/rides`,
    JSON.stringify({
      pickup: { lat: 25.2048, lng: 55.2708, address: 'Dubai Mall' },
      dropoff: { lat: 25.1972, lng: 55.2797, address: 'Dubai Airport T3' },
      vehicleCategoryId: 'economy',
    }),
    { headers: authedHeaders, tags: { endpoint: 'ride_create' } },
  );

  rideRequestDuration.add(Date.now() - start);
  const success = check(response, { 'ride requested 202': (r) => r.status === 202 });
  rideSuccessRate.add(success);
  if (!success) rideRequestErrors.add(1);

  return success ? response.json('rideId') : null;
}

function cancelRide(token, rideId) {
  const authedHeaders = { ...headers, Authorization: `Bearer ${token}` };
  http.patch(
    `${BASE_URL}/api/v1/rides/${rideId}/cancel`,
    null,
    { headers: authedHeaders, tags: { endpoint: 'ride_cancel' } },
  );
}

export default function () {
  group('Ride Booking Flow', () => {
    const token = authenticate();
    if (!token) return;
    sleep(0.5);

    const rideId = requestRide(token);
    sleep(2);

    if (rideId) {
      cancelRide(token, rideId);
    }

    sleep(1);
  });
}
