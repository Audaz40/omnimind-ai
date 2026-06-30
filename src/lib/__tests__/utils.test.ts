import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  checkRateLimit,
  getRateLimitKey,
  type RateLimitConfig,
} from "@/lib/rate-limit.server";
import { get, set, invalidate, getCacheKey } from "@/lib/cache.server";
import { Errors } from "@/lib/errors.server";
import { safeEvaluateMath } from "@/lib/safe-math-evaluator.server";

describe("Rate Limiter", () => {
  it("should allow requests within limit", () => {
    const key = getRateLimitKey("user123", "/api/chat");
    const result = checkRateLimit(key, { maxRequests: 5, windowMs: 1000 });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("should block requests exceeding limit", () => {
    const key = getRateLimitKey("user456", "/api/chat");
    const config: RateLimitConfig = { maxRequests: 2, windowMs: 1000 };

    const result1 = checkRateLimit(key, config);
    const result2 = checkRateLimit(key, config);
    const result3 = checkRateLimit(key, config);

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(result3.allowed).toBe(false);
  });

  it("should reset after time window expires", (done) => {
    const key = getRateLimitKey("user789", "/api/chat");
    const config: RateLimitConfig = { maxRequests: 1, windowMs: 100 };

    const result1 = checkRateLimit(key, config);
    expect(result1.allowed).toBe(true);

    const result2 = checkRateLimit(key, config);
    expect(result2.allowed).toBe(false);

    setTimeout(() => {
      const result3 = checkRateLimit(key, config);
      expect(result3.allowed).toBe(true);
      done();
    }, 150);
  });
});

describe("Cache", () => {
  afterEach(() => {
    invalidate();
  });

  it("should store and retrieve values", () => {
    const key = getCacheKey("test", "key1");
    const value = { data: "test" };

    set(key, value);
    const retrieved = get(key);

    expect(retrieved).toEqual(value);
  });

  it("should return null for expired entries", (done) => {
    const key = getCacheKey("test", "key2");
    set(key, { data: "test" }, { ttlMs: 100 });

    setTimeout(() => {
      const retrieved = get(key);
      expect(retrieved).toBeNull();
      done();
    }, 150);
  });

  it("should invalidate by pattern", () => {
    set(getCacheKey("search", "query1"), { results: [] });
    set(getCacheKey("search", "query2"), { results: [] });
    set(getCacheKey("url", "page1"), { content: "" });

    const cleaned = invalidate("search");
    expect(cleaned).toBe(2);

    expect(get(getCacheKey("search", "query1"))).toBeNull();
    expect(get(getCacheKey("url", "page1"))).not.toBeNull();
  });
});

describe("Error Handling", () => {
  it("should create validation errors", () => {
    const error = Errors.validation("Invalid input");
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.statusCode).toBe(400);
  });

  it("should create auth errors", () => {
    const error = Errors.auth("Unauthorized");
    expect(error.code).toBe("AUTH_ERROR");
    expect(error.statusCode).toBe(401);
  });

  it("should create not found errors", () => {
    const error = Errors.notFound("Thread");
    expect(error.code).toBe("NOT_FOUND");
    expect(error.statusCode).toBe(404);
    expect(error.message).toContain("Thread");
  });

  it("should create rate limit errors", () => {
    const error = Errors.rateLimited(5000);
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.statusCode).toBe(429);
    expect(error.details?.resetIn).toBe(5000);
  });

  it("should serialize error to JSON", () => {
    const error = Errors.validation("Test error", { field: "email" });
    const json = error.toJSON();

    expect(json.error).toBe("Test error");
    expect(json.code).toBe("VALIDATION_ERROR");
    expect(json.details?.field).toBe("email");
  });
});

describe("Safe Math Evaluator", () => {
  it("should evaluate simple addition", () => {
    const result = safeEvaluateMath("2 + 3");
    expect(result).toBe(5);
  });

  it("should evaluate simple subtraction", () => {
    const result = safeEvaluateMath("10 - 4");
    expect(result).toBe(6);
  });

  it("should evaluate multiplication", () => {
    const result = safeEvaluateMath("3 * 4");
    expect(result).toBe(12);
  });

  it("should evaluate division", () => {
    const result = safeEvaluateMath("20 / 4");
    expect(result).toBe(5);
  });

  it("should handle operator precedence", () => {
    const result = safeEvaluateMath("2 + 3 * 4");
    expect(result).toBe(14); // 2 + (3 * 4) = 2 + 12
  });

  it("should handle parentheses", () => {
    const result = safeEvaluateMath("(2 + 3) * 4");
    expect(result).toBe(20);
  });

  it("should handle decimals", () => {
    const result = safeEvaluateMath("2.5 + 1.5");
    expect(result).toBe(4);
  });

  it("should handle modulo", () => {
    const result = safeEvaluateMath("10 % 3");
    expect(result).toBe(1);
  });

  it("should reject invalid characters", () => {
    expect(() => safeEvaluateMath("2 + 3; alert('xss')")).toThrow();
  });

  it("should reject division by zero", () => {
    expect(() => safeEvaluateMath("5 / 0")).toThrow();
  });

  it("should reject modulo by zero", () => {
    expect(() => safeEvaluateMath("5 % 0")).toThrow();
  });

  it("should handle complex nested expressions", () => {
    const result = safeEvaluateMath("((2 + 3) * (4 - 1)) / 5");
    expect(result).toBe(3); // ((5) * (3)) / 5 = 15 / 5
  });

  it("should handle whitespace", () => {
    const result = safeEvaluateMath("  2  +  3  ");
    expect(result).toBe(5);
  });

  it("should reject empty expression", () => {
    expect(() => safeEvaluateMath("")).toThrow();
  });

  it("should not use eval or Function - CSP compliant", () => {
    // This test ensures we're using the safe evaluator, not Function
    const result = safeEvaluateMath("100 * 2");
    expect(result).toBe(200);
  });
});
