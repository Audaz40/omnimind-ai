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

export const buildAppPlugin: ToolPlugin = {
  name: "build_app",
  description:
    "Build a complete multi-file interactive application, web app, component, dashboard, or game. Always call this tool when the user requests building an app, component, website, tool, or prototype.",
  enabled: () => true, // Enabled for all chat modes so users can always build apps!
  create: () =>
    tool({
      description:
        "Build a complete multi-file interactive application, web app, component, dashboard, or game with live sandbox preview.",
      inputSchema: z.object({
        appId: z.string().optional().describe("Optional unique identifier for the app"),
        title: z.string().describe("Clear, catchy title of the application"),
        description: z
          .string()
          .describe("Overview of what the app does and its key interactive features"),
        template: z
          .enum([
            "react",
            "html-js",
            "nextjs",
            "python",
            "node",
            "vue",
            "svelte",
            "web-app",
            "rust",
            "go",
            "c",
            "cpp",
            "java",
            "csharp",
            "ruby",
            "php",
            "sql",
            "bash",
            "swift",
            "kotlin",
            "r",
            "universal-code",
          ])
          .describe("Framework or runtime template best suited for this application"),
        files: z
          .array(
            z.object({
              path: z
                .string()
                .describe("Relative file path (e.g. 'src/App.tsx', 'index.html', 'styles.css')"),
              language: z
                .string()
                .describe("Language extension (e.g. 'tsx', 'jsx', 'html', 'css', 'typescript')"),
              content: z.string().describe("Complete, working source code of the file"),
              description: z.string().optional().describe("Short explanation of the file's role"),
            }),
          )
          .min(1)
          .describe("List of complete source code files required to run the application"),
        entryPoint: z
          .string()
          .optional()
          .describe("Main file to render or start first (default: 'index.html' or 'src/App.tsx' or 'App.tsx')"),
        dependencies: z
          .array(z.string())
          .optional()
          .describe("List of external libraries needed (e.g. ['lucide-react', 'recharts', 'canvas-confetti'])"),
        instructions: z
          .string()
          .optional()
          .describe("Setup instructions or interactive guide for the user"),
      }),
      execute: async (input) => {
        const appId =
          input.appId || `app-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const entryPoint =
          input.entryPoint ||
          (input.files.find((f) => f.path.includes("App.tsx") || f.path.includes("index.html"))?.path ??
            input.files[0]?.path ??
            "index.html");

        return {
          acknowledged: true,
          appId,
          title: input.title,
          description: input.description,
          template: input.template,
          files: input.files,
          entryPoint,
          dependencies: input.dependencies || [],
          instructions:
            input.instructions ||
            "Your application has been generated and loaded into the interactive sandbox preview!",
          status: "built",
          createdAt: new Date().toISOString(),
        };
      },
    }),
};

export const editAppPlugin: ToolPlugin = {
  name: "edit_app",
  description:
    "Modify, enhance, or fix an existing built application by updating its code files or adding new interactive capabilities.",
  enabled: () => true, // Enabled for all chat modes
  create: () =>
    tool({
      description: "Modify or enhance an existing application's code and files.",
      inputSchema: z.object({
        appId: z.string().optional().describe("ID of the app being edited"),
        title: z.string().describe("Updated title of the application"),
        description: z
          .string()
          .describe("Summary of changes and enhancements made to the application"),
        template: z
          .enum([
            "react",
            "html-js",
            "nextjs",
            "python",
            "node",
            "vue",
            "svelte",
            "web-app",
            "rust",
            "go",
            "c",
            "cpp",
            "java",
            "csharp",
            "ruby",
            "php",
            "sql",
            "bash",
            "swift",
            "kotlin",
            "r",
            "universal-code",
          ])
          .describe("Framework or runtime template"),
        files: z
          .array(
            z.object({
              path: z.string().describe("Relative file path"),
              language: z.string().describe("Language extension"),
              content: z.string().describe("Complete, updated source code of the file"),
              description: z.string().optional().describe("File description"),
            }),
          )
          .min(1)
          .describe("Updated list of all source code files in the application"),
        entryPoint: z.string().optional().describe("Main file to run"),
        dependencies: z
          .array(z.string())
          .optional()
          .describe("Updated list of external libraries"),
        instructions: z.string().optional().describe("Updated instructions or change notes"),
      }),
      execute: async (input) => {
        const appId =
          input.appId || `app-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const entryPoint =
          input.entryPoint ||
          (input.files.find((f) => f.path.includes("App.tsx") || f.path.includes("index.html"))?.path ??
            input.files[0]?.path ??
            "index.html");

        return {
          acknowledged: true,
          appId,
          title: input.title,
          description: input.description,
          template: input.template,
          files: input.files,
          entryPoint,
          dependencies: input.dependencies || [],
          instructions:
            input.instructions ||
            "Your application updates have been applied and loaded into the live preview!",
          status: "updated",
          updatedAt: new Date().toISOString(),
        };
      },
    }),
};

export const generateDiagramPlugin: ToolPlugin = {
  name: "generate_diagram",
  description:
    "Generate an interactive architecture, sequence, flowchart, class, state, or Gantt diagram using Mermaid.js syntax.",
  enabled: () => true,
  create: () =>
    tool({
      description: "Generate an interactive diagram using Mermaid syntax.",
      inputSchema: z.object({
        title: z.string().describe("Diagram title"),
        diagramType: z
          .enum(["flowchart", "sequence", "class", "state", "gantt", "architecture"])
          .describe("Type of diagram"),
        code: z.string().describe("Complete Mermaid code block (e.g., 'flowchart TD\n  A[Start] --> B[End]')"),
        description: z.string().optional().describe("Brief explanation of the diagram"),
      }),
      execute: async (input) => ({
        ...input,
        acknowledged: true,
        generatedAt: new Date().toISOString(),
      }),
    }),
};

export const analyzeTabularDataPlugin: ToolPlugin = {
  name: "analyze_tabular_data",
  description:
    "Take structured JSON or CSV data and create interactive charts (bar, line, pie) and sortable data tables with Recharts.",
  enabled: () => true,
  create: () =>
    tool({
      description: "Create interactive data visualizations and sortable analytics tables.",
      inputSchema: z.object({
        title: z.string().describe("Visualization title"),
        summary: z.string().describe("Brief analytical summary of insights from the data"),
        chartType: z.enum(["bar", "line", "pie", "table"]).describe("Primary initial view"),
        xAxisKey: z.string().describe("Property name to use for X axis labels"),
        dataKeys: z.array(z.string()).min(1).describe("Property names of numeric columns to plot"),
        data: z
          .array(z.record(z.union([z.string(), z.number()])))
          .min(1)
          .describe("Array of data objects"),
      }),
      execute: async (input) => ({
        ...input,
        acknowledged: true,
        analyzedAt: new Date().toISOString(),
      }),
    }),
};

// Register built-in plugins
registerPlugin(webSearchPlugin);
registerPlugin(fetchUrlPlugin);
registerPlugin(createPlanPlugin);
registerPlugin(runCalculationPlugin);
registerPlugin(buildAppPlugin);
registerPlugin(editAppPlugin);
registerPlugin(generateDiagramPlugin);
registerPlugin(analyzeTabularDataPlugin);
