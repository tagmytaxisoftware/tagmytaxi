/**
 * @fileoverview Cache service interface — an abstraction over Redis.
 * @module @tagmytaxi/shared/interfaces
 */

/**
 * Generic cache service interface. All key operations are namespaced
 * by the caller; the implementation does not add a global prefix.
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  /** Increment a counter and return the new value */
  increment(key: string, by?: number): Promise<number>;
  /** Set expiry on an existing key without changing its value */
  expire(key: string, ttlSeconds: number): Promise<void>;
  /** Acquire a distributed lock; returns false if already held */
  acquireLock(key: string, ttlSeconds: number): Promise<boolean>;
  releaseLock(key: string): Promise<void>;
}
