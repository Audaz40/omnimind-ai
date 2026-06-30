/**
 * Centralized error handling and logging
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "INVALID_REQUEST"
  | "RESOURCE_NOT_FOUND";

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = "AppError";
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

export function createErrorResponse(error: unknown, defaultStatusCode = 500) {
  const isAppError = error instanceof AppError;

  const statusCode = isAppError ? error.statusCode : defaultStatusCode;
  const code = isAppError ? error.code : "INTERNAL_ERROR";
  const message = error instanceof Error ? error.message : "An unexpected error occurred";

  const response = new Response(
    JSON.stringify({
      error: message,
      code,
      details: isAppError ? error.details : undefined,
    }),
    {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    },
  );

  logError(error, { statusCode, code });
  return response;
}

export function logError(error: unknown, context?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[${timestamp}] ERROR: ${message}`, {
    ...context,
    stack: stack ? stack.split("\n").slice(0, 5) : undefined,
  });
}

export function logInfo(message: string, data?: Record<string, any>) {
  console.log(`[${new Date().toISOString()}] INFO: ${message}`, data);
}

// Common error creators
export const Errors = {
  validation: (message: string, details?: Record<string, any>) =>
    new AppError("VALIDATION_ERROR", message, 400, details),

  auth: (message = "Unauthorized") => new AppError("AUTH_ERROR", message, 401),

  notFound: (resource: string) => new AppError("NOT_FOUND", `${resource} not found`, 404),

  rateLimited: (resetIn: number) =>
    new AppError("RATE_LIMITED", `Rate limited. Try again in ${resetIn}ms`, 429, { resetIn }),

  internal: (message = "Internal server error") => new AppError("INTERNAL_ERROR", message, 500),

  invalidRequest: (message: string) => new AppError("INVALID_REQUEST", message, 400),
};
