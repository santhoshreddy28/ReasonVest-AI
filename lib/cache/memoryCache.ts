interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * A minimal in-process TTL cache - deliberately NOT a generic LRU or a
 * wrapper around a caching library. This app runs as a small number of
 * server instances, not a large fleet, so a plain Map with lazy expiry
 * checks on read is enough; reaching for Redis or an LRU package here
 * would be solving a scale problem this app doesn't have (yet). If that
 * changes, this class's get/set/delete shape is exactly what
 * lib/cache/reportCache.ts already treats as the "fast tier" in front of
 * MongoDB - swapping the implementation behind it wouldn't touch callers.
 */
export class MemoryCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(private readonly defaultTtlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number = this.defaultTtlMs): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}
