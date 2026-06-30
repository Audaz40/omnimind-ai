/**
 * Type-safe constants for the application
 */

export const CONSTANTS = {
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 30,
  RATE_LIMIT_CHAT_MAX: 30,
  RATE_LIMIT_GENERAL_MAX: 100,

  // Caching
  CACHE_TTL_SEARCH_MS: 24 * 60 * 60 * 1000, // 24 hours
  CACHE_TTL_URL_MS: 24 * 60 * 60 * 1000, // 24 hours
  CACHE_TTL_THREAD_MS: 5 * 60 * 1000, // 5 minutes
  CACHE_MAX_ENTRIES: 10000,

  // Pagination
  MESSAGES_PER_PAGE: 100,
  THREADS_PER_PAGE: 50,

  // Validation
  MIN_MESSAGE_LENGTH: 1,
  MAX_MESSAGE_LENGTH: 16384,
  MAX_THREAD_TITLE_LENGTH: 120,
  MAX_THREAD_NAME_LENGTH: 50,
  MAX_PLAN_STEPS: 10,
  MIN_PLAN_STEPS: 2,

  // Performance
  SLOW_OPERATION_THRESHOLD_MS: 1000,
  REQUEST_TIMEOUT_MS: 30000,

  // Search
  MAX_SEARCH_RESULTS: 6,
  MAX_FETCH_SIZE_CHARS: 4000,

  // Agent mode
  AGENT_MAX_STEPS: 50,
  AGENT_TIMEOUT_MS: 120000, // 2 minutes

  // Database
  CONNECTION_TIMEOUT_MS: 5000,
  QUERY_TIMEOUT_MS: 10000,

  // UI
  DEFAULT_THEME: "dark",
  SIDEBAR_WIDTH_DEFAULT: 280,
} as const;

// Export type-safe configuration
export type AppConfig = typeof CONSTANTS;

// Environment-specific overrides
export function getConfigValue<K extends keyof AppConfig>(key: K): AppConfig[K] {
  const envValue = process.env[`NOVA_${key}`];
  if (envValue !== undefined) {
    // Try parsing as number
    if (!isNaN(Number(envValue))) {
      return Number(envValue) as AppConfig[K];
    }
    // Try parsing as boolean
    if (envValue === "true" || envValue === "false") {
      return (envValue === "true") as AppConfig[K];
    }
    return envValue as AppConfig[K];
  }
  return CONSTANTS[key];
}
