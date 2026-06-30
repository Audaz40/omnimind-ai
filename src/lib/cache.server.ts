/**
 * Simple in-memory cache for search results and URLs
 * For production, use Redis
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

export interface CacheConfig {
  ttlMs?: number;
}

const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function getCacheKey(namespace: string, ...parts: (string | number)[]): string {
  return `${namespace}:${parts.join(":")}`;
}

export function get<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

export function set<T>(key: string, value: T, config: CacheConfig = {}): void {
  const ttl = config.ttlMs ?? DEFAULT_TTL;
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  });
}

export function invalidate(pattern?: string): number {
  if (!pattern) {
    const count = cache.size;
    cache.clear();
    return count;
  }

  let count = 0;
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
      count++;
    }
  }
  return count;
}

// Cleanup expired entries every 10 minutes
setInterval(
  () => {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of cache.entries()) {
      if (now >= entry.expiresAt) {
        cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`[Cache] Cleaned ${cleaned} expired entries`);
    }
  },
  10 * 60 * 1000,
);
