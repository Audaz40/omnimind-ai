/**
 * Performance utilities
 * Tools for measuring and optimizing performance
 */

interface Metric {
  name: string;
  duration: number;
  timestamp: number;
}

const metrics: Metric[] = [];
const MAX_METRICS = 1000;

export function measureTime(name: string, fn: () => void): number {
  const start = performance.now();
  try {
    fn();
  } finally {
    const duration = performance.now() - start;
    recordMetric(name, duration);
    return duration;
  }
}

export async function measureAsyncTime(name: string, fn: () => Promise<void>): Promise<number> {
  const start = performance.now();
  try {
    await fn();
  } finally {
    const duration = performance.now() - start;
    recordMetric(name, duration);
    return duration;
  }
}

function recordMetric(name: string, duration: number) {
  metrics.push({
    name,
    duration,
    timestamp: Date.now(),
  });

  // Keep only recent metrics
  if (metrics.length > MAX_METRICS) {
    metrics.splice(0, metrics.length - MAX_METRICS);
  }

  // Log slow operations
  if (duration > 1000) {
    console.warn(`[Performance] Slow operation: ${name} took ${duration.toFixed(2)}ms`);
  }
}

export function getMetrics(
  name?: string,
  since?: number,
): { name: string; avg: number; min: number; max: number; count: number }[] {
  let filtered = metrics;

  if (name) {
    filtered = filtered.filter((m) => m.name === name);
  }

  if (since) {
    filtered = filtered.filter((m) => m.timestamp >= since);
  }

  const grouped = new Map<string, { durations: number[]; timestamp: number }>();

  for (const metric of filtered) {
    if (!grouped.has(metric.name)) {
      grouped.set(metric.name, { durations: [], timestamp: 0 });
    }
    const entry = grouped.get(metric.name)!;
    entry.durations.push(metric.duration);
    entry.timestamp = Math.max(entry.timestamp, metric.timestamp);
  }

  return Array.from(grouped.entries()).map(([name, data]) => ({
    name,
    avg: data.durations.reduce((a, b) => a + b, 0) / data.durations.length,
    min: Math.min(...data.durations),
    max: Math.max(...data.durations),
    count: data.durations.length,
  }));
}

export function clearMetrics() {
  metrics.length = 0;
}

// Example usage:
// const duration = measureTime("parse_json", () => {
//   JSON.parse(largeString);
// });
//
// const duration = await measureAsyncTime("fetch_data", async () => {
//   await fetch("/api/data");
// });
