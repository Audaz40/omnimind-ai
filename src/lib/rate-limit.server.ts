/**
 * In-memory rate limiter with sliding window
 * For production, use Redis instead
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limits = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // milliseconds
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
};

export function getRateLimitKey(userId: string, endpoint: string): string {
  return `${userId}:${endpoint}`;
}

export function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {},
): { allowed: boolean; remaining: number; resetIn: number } {
  const merged = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();
  const entry = limits.get(key);

  // Reset if window expired
  if (!entry || now >= entry.resetAt) {
    limits.set(key, {
      count: 1,
      resetAt: now + merged.windowMs,
    });
    return {
      allowed: true,
      remaining: merged.maxRequests - 1,
      resetIn: merged.windowMs,
    };
  }

  // Check if limit exceeded
  const allowed = entry.count < merged.maxRequests;
  if (allowed) {
    entry.count++;
  }

  return {
    allowed,
    remaining: Math.max(0, merged.maxRequests - entry.count),
    resetIn: Math.max(0, entry.resetAt - now),
  };
}

// Cleanup old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of limits.entries()) {
    if (now >= entry.resetAt) {
      limits.delete(key);
    }
  }
}, 60 * 1000);
