/**
 * Plugin system for tools
 * Allows easy addition of new tools without modifying the core chat endpoint
 */

import { tool, type Tool } from "ai";
import { z } from "zod";
import { safeEvaluateMath } from "@/lib/safe-math-evaluator.server";

export interface ToolPlugin {
  name: string;
  description: string;
  enabled: (agentMode: boolean) => boolean;
  create: () => Tool;
}

interface PluginRegistry {
  [key: string]: ToolPlugin;
}

const plugins: PluginRegistry = {};

export function registerPlugin(plugin: ToolPlugin) {
  plugins[plugin.name] = plugin;
  console.log(`[Plugins] Registered tool: ${plugin.name}`);
}

export function getAvailableTools(agentMode: boolean) {
  const tools: Record<string, Tool> = {};

  for (const [name, plugin] of Object.entries(plugins)) {
    if (plugin.enabled(agentMode)) {
      tools[name] = plugin.create();
    }
  }

  return tools;
}

// Built-in web search plugin
async function ddgSearch(query: string) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; NovaAI/1.0; +https://lovable.dev)",
    },
  });
  const html = await res.text();
  const results: { title: string; url: string; snippet: string }[] = [];
  const re =
    /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && results.length < 6) {
    const strip = (s: string) =>
      s
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    let href = m[1];
    try {
      const u = new URL(href, "https://duckduckgo.com");
      const real = u.searchParams.get("uddg");
      if (real) href = decodeURIComponent(real);
    } catch {
      /* noop */
    }
    results.push({
      title: strip(m[2]),
      url: href,
      snippet: strip(m[3]),
    });
  }
  return results;
}

export const webSearchPlugin: ToolPlugin = {
  name: "web_search",
  description:
    "Search the public web via DuckDuckGo. Returns top results with title, url, and snippet.",
  enabled: (agentMode) => agentMode,
  create: () =>
    tool({
      description:
        "Search the public web via DuckDuckGo. Returns top results with title, url, and snippet.",
      inputSchema: z.object({
        query: z.string().describe("Search query"),
      }),
      execute: async ({ query }) => {
        try {
          const results = await ddgSearch(query);
          return { query, results };
        } catch (e) {
          return { error: (e as Error).message, query };
        }
      },
    }),
};

export const fetchUrlPlugin: ToolPlugin = {
  name: "fetch_url",
  description: "Fetch a URL and return its text content (HTML stripped, truncated to 4000 chars).",
  enabled: (agentMode) => agentMode,
  create: () =>
    tool({
      description:
        "Fetch a URL and return its text content (HTML stripped, truncated to 4000 chars).",
      inputSchema: z.object({ url: z.string().url() }),
      execute: async ({ url }) => {
        try {
          const res = await fetch(url, {
            headers: { "User-Agent": "NovaAI/1.0" },
          });
          const ct = res.headers.get("content-type") ?? "";
          const raw = await res.text();
          const text = ct.includes("html")
            ? raw
                .replace(/<script[\s\S]*?<\/script>/gi, "")
                .replace(/<style[\s\S]*?<\/style>/gi, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim()
            : raw;
          return {
            url,
            status: res.status,
            content: text.slice(0, 4000),
          };
        } catch (e) {
          return { error: (e as Error).message, url };
        }
      },
    }),
};

export const createPlanPlugin: ToolPlugin = {
  name: "create_plan",
  description:
    "Emit a structured plan with ordered steps. Call this BEFORE working on complex tasks.",
  enabled: (agentMode) => agentMode,
  create: () =>
    tool({
      description:
        "Emit a structured plan with ordered steps. Call this BEFORE working on complex tasks.",
      inputSchema: z.object({
        goal: z.string(),
        steps: z.array(z.string()).min(2).max(10),
      }),
      execute: async ({ goal, steps }) => ({
        goal,
        steps,
        acknowledged: true,
      }),
    }),
};

export const runCalculationPlugin: ToolPlugin = {
  name: "run_calculation",
  description: "Safely evaluate a basic math expression (numbers and + - * / % ( ) . , only).",
  enabled: (agentMode) => agentMode,
  create: () =>
    tool({
      description: "Safely evaluate a basic math expression (numbers and + - * / % ( ) . , only).",
      inputSchema: z.object({ expression: z.string() }),
      execute: async ({ expression }) => {
        try {
          const result = safeEvaluateMath(expression);
          return { expression, result };
        } catch (e) {
          return { error: (e as Error).message };
        }
      },
    }),
};

// Register built-in plugins
registerPlugin(webSearchPlugin);
registerPlugin(fetchUrlPlugin);
registerPlugin(createPlanPlugin);
registerPlugin(runCalculationPlugin);
