/**
 * @fileoverview Runtime validation helpers for boundary inputs.
 * @module @tagmytaxi/shared/utils/validation
 */

import type { Coordinate } from '../types/location';
import type { E164Phone } from '../types/common';

/** E.164 phone number regex */
const E164_REGEX = /^\+[1-9]\d{1,14}$/;

/** UUID v4 regex */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates an E.164 phone number.
 *
 * @param phone - The phone number string to validate.
 * @returns True if the phone number is valid E.164 format.
 */
export function isValidE164Phone(phone: string): phone is E164Phone {
  return E164_REGEX.test(phone);
}

/**
 * Validates a UUID v4 string.
 *
 * @param id - The string to validate.
 * @returns True if the string is a valid UUID v4.
 */
export function isValidUUID(id: string): boolean {
  return UUID_V4_REGEX.test(id);
}

/**
 * Validates that a coordinate has valid lat/lng ranges.
 *
 * @param coord - The coordinate to validate.
 * @returns True if both lat and lng are within valid ranges.
 */
export function isValidCoordinate(coord: Partial<Coordinate>): coord is Coordinate {
  return (
    typeof coord.lat === 'number' &&
    typeof coord.lng === 'number' &&
    coord.lat >= -90 &&
    coord.lat <= 90 &&
    coord.lng >= -180 &&
    coord.lng <= 180 &&
    !isNaN(coord.lat) &&
    !isNaN(coord.lng)
  );
}

/**
 * Validates an email address format.
 * Intentionally permissive — full validation requires sending a verification email.
 *
 * @param email - The email string to validate.
 * @returns True if the email format is plausible.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Clamps a numeric value to [min, max].
 *
 * @param value - Value to clamp.
 * @param min - Minimum allowed value.
 * @param max - Maximum allowed value.
 * @returns Clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
