/**
 * @fileoverview Ride status constants and state machine transitions.
 * @module @tagmytaxi/shared/constants
 */

import type { RideStatus } from '../types/ride';

/**
 * Valid state transitions in the ride lifecycle.
 * Key = current status, value = allowed next statuses.
 */
export const RIDE_STATUS_TRANSITIONS: Readonly<Record<RideStatus, ReadonlyArray<RideStatus>>> = {
  PENDING: ['DRIVER_ASSIGNED', 'CANCELLED'],
  DRIVER_ASSIGNED: ['DRIVER_ARRIVED', 'CANCELLED'],
  DRIVER_ARRIVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: ['PAYMENT_FAILED'],
  CANCELLED: [],
  PAYMENT_FAILED: [],
};

/**
 * Terminal ride states — once reached, no further transitions are allowed.
 */
export const TERMINAL_RIDE_STATUSES: ReadonlyArray<RideStatus> = [
  'COMPLETED',
  'CANCELLED',
  'PAYMENT_FAILED',
];

/**
 * Returns true if the given transition is allowed by the state machine.
 */
export function isValidTransition(from: RideStatus, to: RideStatus): boolean {
  return (RIDE_STATUS_TRANSITIONS[from] as ReadonlyArray<RideStatus>).includes(to);
}

/**
 * Returns true if the ride is in a terminal state.
 */
export function isTerminalStatus(status: RideStatus): boolean {
  return (TERMINAL_RIDE_STATUSES as ReadonlyArray<RideStatus>).includes(status);
}
