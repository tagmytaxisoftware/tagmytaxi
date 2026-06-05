/**
 * @fileoverview Core domain primitives shared across all TagMyTaxi packages.
 * @module @tagmytaxi/shared/types/common
 */

/** Branded string type for tenant identifiers */
export type TenantId = string & { readonly __brand: 'TenantId' };

/** Branded string type for ride identifiers */
export type RideId = string & { readonly __brand: 'RideId' };

/** Branded string type for driver identifiers */
export type DriverId = string & { readonly __brand: 'DriverId' };

/** Branded string type for passenger identifiers */
export type PassengerId = string & { readonly __brand: 'PassengerId' };

/** Branded string type for transaction identifiers */
export type TransactionId = string & { readonly __brand: 'TransactionId' };

/** ISO 8601 datetime string */
export type ISODateString = string & { readonly __brand: 'ISODateString' };

/**
 * Functional result type for operations that can fail with a typed error.
 * Prefer this over throwing exceptions in business logic.
 */
export type Result<T, E = Error> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

/**
 * Pagination parameters for list endpoints.
 */
export interface PaginationParams {
  readonly page: number;
  readonly limit: number;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper.
 */
export interface PaginatedResult<T> {
  readonly data: ReadonlyArray<T>;
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly hasNextPage: boolean;
  readonly hasPrevPage: boolean;
}

/**
 * Standard API error shape returned by the REST layer.
 */
export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly traceId: string;
  readonly timestamp: ISODateString;
  readonly details?: ReadonlyArray<{ readonly field: string; readonly issue: string }>;
}

/**
 * Phone number in E.164 format (e.g. "+971501234567").
 */
export type E164Phone = string & { readonly __brand: 'E164Phone' };

/**
 * ISO 4217 currency code (e.g. "AED", "USD").
 */
export type CurrencyCode = string & { readonly __brand: 'CurrencyCode' };
