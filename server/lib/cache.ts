/**
 * Simple in-memory cache with TTL
 * For production, consider Redis or similar for multi-instance support
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly defaultTtlMs: number;
  private readonly maxSize: number;

  constructor(defaultTtlMs: number = 60000, maxSize: number = 10000) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxSize = maxSize;

    // Periodic cleanup every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get cached value if not expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached value with optional TTL
   */
  set(key: string, data: T, ttlMs?: number): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  /**
   * Delete cached value
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Delete all entries matching a prefix
   */
  deleteByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  get stats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// Singleton caches for different data types
// 60 second TTL for entitlements (balances change frequently with usage)
export const entitlementsCache = new MemoryCache<any>(60 * 1000, 5000);

// 5 minute TTL for subscriptions (change less frequently)
export const subscriptionsCache = new MemoryCache<any>(5 * 60 * 1000, 5000);

/**
 * Cache key generators
 */
export const CacheKeys = {
  entitlements: (userId: string) => `entitlements:${userId}`,
  subscription: (userId: string) => `subscription:${userId}`,
  tokenBalance: (userId: string) => `tokenBalance:${userId}`,
  todayUsage: (userId: string, date: string) => `usage:${userId}:${date}`,
  monthlyUsage: (userId: string, month: string) => `monthlyUsage:${userId}:${month}`,
};

/**
 * Invalidate all caches for a user (call after mutations)
 */
export function invalidateUserCaches(userId: string): void {
  entitlementsCache.deleteByPrefix(`entitlements:${userId}`);
  entitlementsCache.deleteByPrefix(`usage:${userId}`);
  entitlementsCache.deleteByPrefix(`monthlyUsage:${userId}`);
  subscriptionsCache.deleteByPrefix(`subscription:${userId}`);
  subscriptionsCache.deleteByPrefix(`tokenBalance:${userId}`);
}
