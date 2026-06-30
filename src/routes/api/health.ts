/**
 * Health check and monitoring endpoint
 * Provides system status, metrics, and diagnostics
 */

import { createFileRoute } from "@tanstack/react-router";
import { getMetrics } from "@/lib/performance.server";
import { logInfo } from "@/lib/errors.server";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  metrics: ReturnType<typeof getMetrics>;
  environment: string;
}

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const memUsage = process.memoryUsage();
          const metrics = getMetrics().slice(0, 10); // Top 10 metrics

          const health: HealthStatus = {
            status: "healthy",
            timestamp: new Date().toISOString(),
            version: process.env.VERSION || "1.0.0",
            uptime: process.uptime(),
            memory: {
              heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
              heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
              external: Math.round(memUsage.external / 1024 / 1024),
            },
            metrics,
            environment: process.env.NODE_ENV || "development",
          };

          // Check for warnings
          if (health.memory.heapUsed > health.memory.heapTotal * 0.8) {
            health.status = "degraded";
          }

          logInfo("Health check", { status: health.status });

          return new Response(JSON.stringify(health), {
            status: health.status === "unhealthy" ? 503 : 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Health check failed:", error);
          return new Response(
            JSON.stringify({
              status: "unhealthy",
              error: String(error),
              timestamp: new Date().toISOString(),
            }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
