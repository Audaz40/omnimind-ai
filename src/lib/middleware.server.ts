/**
 * Middleware for rate limiting on server functions
 */

import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit.server";
import { Errors } from "@/lib/errors.server";
import { CONSTANTS } from "@/lib/constants.server";

export interface MiddlewareContext {
  userId: string;
  endpoint: string;
}

export function createRateLimitMiddleware(
  maxRequests: number = CONSTANTS.RATE_LIMIT_GENERAL_MAX,
  windowMs: number = CONSTANTS.RATE_LIMIT_WINDOW_MS,
) {
  return async (context: MiddlewareContext, proceed: () => Promise<any>) => {
    const key = getRateLimitKey(context.userId, context.endpoint);
    const result = checkRateLimit(key, { maxRequests, windowMs });

    if (!result.allowed) {
      throw Errors.rateLimited(result.resetIn);
    }

    return proceed();
  };
}

/**
 * Compose multiple middleware
 */
export function composeMiddleware<T>(
  ...middlewares: Array<(context: T, next: () => Promise<any>) => Promise<any>>
) {
  return async (context: T, handler: () => Promise<any>) => {
    let index = -1;

    const next = async () => {
      if (index >= middlewares.length) {
        return handler();
      }
      index++;
      return middlewares[index](context, next);
    };

    return next();
  };
}
