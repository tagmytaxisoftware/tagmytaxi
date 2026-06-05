/**
 * @fileoverview Pure geospatial utility functions.
 * Zero runtime dependencies — safe to use in any environment.
 * @module @tagmytaxi/shared/utils/coordinates
 */

import type { Coordinate } from '../types/location';

const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;

/**
 * Computes the great-circle distance between two coordinates using the
 * Haversine formula. Accurate to within ~0.3% for distances < 1000 km.
 *
 * @param a - First coordinate.
 * @param b - Second coordinate.
 * @returns Distance in kilometres.
 */
export function haversineDistance(a: Coordinate, b: Coordinate): number {
  const dLat = (b.lat - a.lat) * DEG_TO_RAD;
  const dLng = (b.lng - a.lng) * DEG_TO_RAD;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const chord =
    sinDLat * sinDLat +
    Math.cos(a.lat * DEG_TO_RAD) * Math.cos(b.lat * DEG_TO_RAD) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(chord));
}

/**
 * Computes the initial bearing from `from` to `to` in degrees clockwise
 * from true north (range: [0, 360)).
 *
 * @param from - Origin coordinate.
 * @param to - Destination coordinate.
 * @returns Bearing in degrees.
 */
export function bearing(from: Coordinate, to: Coordinate): number {
  const lat1 = from.lat * DEG_TO_RAD;
  const lat2 = to.lat * DEG_TO_RAD;
  const dLng = (to.lng - from.lng) * DEG_TO_RAD;
  const x = Math.cos(lat2) * Math.sin(dLng);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(x, y) / DEG_TO_RAD) + 360) % 360;
}

/**
 * Computes the destination coordinate given an origin, distance, and bearing.
 * Useful for expanding search radii in the matching service.
 *
 * @param origin - Starting coordinate.
 * @param distanceKm - Distance to travel in kilometres.
 * @param bearingDeg - Direction of travel in degrees clockwise from north.
 * @returns Destination coordinate.
 */
export function destinationPoint(
  origin: Coordinate,
  distanceKm: number,
  bearingDeg: number,
): Coordinate {
  const angularDistance = distanceKm / EARTH_RADIUS_KM;
  const bearingRad = bearingDeg * DEG_TO_RAD;
  const lat1 = origin.lat * DEG_TO_RAD;
  const lng1 = origin.lng * DEG_TO_RAD;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    lat: lat2 / DEG_TO_RAD,
    lng: ((lng2 / DEG_TO_RAD + 540) % 360) - 180,
  };
}

/**
 * Returns true if `point` is within `radiusKm` of `center`.
 *
 * @param center - Center of the search area.
 * @param point - Point to test.
 * @param radiusKm - Radius in kilometres.
 */
export function isWithinRadius(center: Coordinate, point: Coordinate, radiusKm: number): boolean {
  return haversineDistance(center, point) <= radiusKm;
}

/**
 * Validates that a coordinate has valid lat/lng ranges.
 *
 * @param coord - Coordinate to validate.
 * @returns True if the coordinate is valid.
 */
export function isValidCoordinate(coord: Coordinate): boolean {
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
