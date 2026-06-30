import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type Body = {
  messages?: UIMessage[];
  agentMode?: boolean;
  threadId?: string;
};

const SYSTEM_BASE = `You are NOVA, an advanced AI assistant inspired by Google's AI Mode but significantly enhanced.

CORE BEHAVIOR
- Think carefully before answering. For complex questions, first write a brief "Plan:" section (3-6 bullets) of how you will approach the problem, then deliver the answer.
- Use clear, well-structured markdown: headings, lists, tables, bold for key terms.
- When writing code, ALWAYS use fenced code blocks with a language tag. You are an expert in MANY languages: TypeScript, JavaScript, Python, Rust, Go, Java, C, C++, C#, Swift, Kotlin, Ruby, PHP, SQL, Bash, HTML, CSS, R, Julia, Haskell, Elixir, Lua, Dart, Solidity, Zig, Scala, Perl, MATLAB, Assembly, Fortran, COBOL, Clojure, OCaml, F#, GLSL, HLSL, YAML, JSON, TOML, Dockerfile, GraphQL, and more. Pick the best language for the task; explain why if non-obvious.
- For multi-file or non-trivial code: show file paths as comments, include error handling, edge cases, complexity notes.
- Cite sources when you used a tool. Be honest about uncertainty.
- Default language: respond in the user's language.`;

const AGENT_ADDENDUM = `

AGENT MODE IS ACTIVE
You may call tools to gather information and complete tasks autonomously:
- web_search: search the public web for fresh information
- fetch_url: download the text content of a URL
- create_plan: emit a structured plan that the UI will render specially
- run_calculation: evaluate a math expression safely

Workflow for complex tasks:
1. Call create_plan with concrete steps.
2. Execute steps using tools as needed (chain multiple tool calls).
3. Synthesize a final answer that references what you found.
Always finish with a clear, written answer for the user.`;

async function ddgSearch(query: string) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; NovaAI/1.0; +https://lovable.dev)",
    },
  });
  const html = await res.text();
  const results: { title: string; url: string; snippet: string }[] = [];
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && results.length < 6) {
    const strip = (s: string) =>
      s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
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

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, agentMode } = (await request.json()) as Body;
        if (!Array.isArray(messages)) {
          return new Response("Messages required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const tools = agentMode
          ? {
              web_search: tool({
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
              fetch_url: tool({
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
              create_plan: tool({
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
              run_calculation: tool({
                description:
                  "Safely evaluate a basic math expression (numbers and + - * / % ( ) . , only).",
                inputSchema: z.object({ expression: z.string() }),
                execute: async ({ expression }) => {
                  if (!/^[\d+\-*/%().,\s]+$/.test(expression)) {
                    return { error: "Unsafe expression" };
                  }
                  try {
                    const result = Function(`"use strict"; return (${expression})`)();
                    return { expression, result };
                  } catch (e) {
                    return { error: (e as Error).message };
                  }
                },
              }),
            }
          : undefined;

        const result = streamText({
          model,
          system: SYSTEM_BASE + (agentMode ? AGENT_ADDENDUM : ""),
          messages: convertToModelMessages(messages),
          tools,
          stopWhen: stepCountIs(50),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
        });
      },
    },
  },
});
