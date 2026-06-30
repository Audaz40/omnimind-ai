/**
 * Aggregation utilities for common patterns
 */

export interface Result<T, E = Error> {
  ok: boolean;
  data?: T;
  error?: E;
}

/**
 * Create a successful result
 */
export function Ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

/**
 * Create an error result
 */
export function Err<T, E>(error: E): Result<T, E> {
  return { ok: false, error };
}

/**
 * Extract value or throw error
 */
export function unwrap<T>(result: Result<T>): T {
  if (result.ok && result.data) {
    return result.data;
  }
  throw result.error || new Error("Unknown error");
}

/**
 * Try-catch wrapper that returns Result
 */
export async function asyncTry<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await fn();
    return Ok(data);
  } catch (error) {
    return Err(error as Error);
  }
}

/**
 * Batch multiple async operations
 */
export async function batch<T>(
  operations: Array<() => Promise<T>>,
  concurrency: number = 3,
): Promise<Result<T>[]> {
  const results: Result<T>[] = [];
  const executing: Promise<void>[] = [];

  for (const operation of operations) {
    const promise = asyncTry(operation).then((result) => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((p) => !p),
        1,
      );
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Retry logic with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelayMs: number = 100,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        console.warn(
          `[Retry] Attempt ${attempt}/${maxAttempts} failed. Retrying in ${delay}ms`,
          lastError.message,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Max retry attempts reached");
}

/**
 * Deduplicate concurrent requests
 */
const dedupeCache = new Map<string, Promise<any>>();

export async function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (dedupeCache.has(key)) {
    return dedupeCache.get(key)!;
  }

  const promise = fn()
    .then((result) => {
      dedupeCache.delete(key);
      return result;
    })
    .catch((error) => {
      dedupeCache.delete(key);
      throw error;
    });

  dedupeCache.set(key, promise);
  return promise;
}

/**
 * Chain of responsibility for command handling
 */
export interface CommandHandler<T, R> {
  handle(command: T): Promise<R> | R;
}

export class CommandBus<T, R> {
  private handlers: CommandHandler<T, R>[] = [];

  register(handler: CommandHandler<T, R>) {
    this.handlers.push(handler);
    return this;
  }

  async execute(command: T): Promise<R> {
    for (const handler of this.handlers) {
      try {
        return await handler.handle(command);
      } catch (error) {
        if (this.handlers.indexOf(handler) === this.handlers.length - 1) {
          throw error;
        }
        // Try next handler
      }
    }
    throw new Error("No handler found for command");
  }
}
