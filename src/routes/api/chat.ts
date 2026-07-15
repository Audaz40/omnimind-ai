import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { getAvailableTools } from "@/lib/plugin-system.server";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit.server";
import { get as getCache, set as setCache, getCacheKey } from "@/lib/cache.server";
import { Errors, createErrorResponse, logInfo, logError } from "@/lib/errors.server";

const SYSTEM_BASE = `You are NOVA, an advanced AI assistant inspired by Google's AI Mode and supercharged with a full Multi-File Interactive App Builder, Diagram Generator, and Data Analytics Engine.

CORE BEHAVIOR
- Think carefully before answering. For complex questions, first write a brief "Plan:" section (3-6 bullets) of how you will approach the problem, then deliver the answer.
- Use clear, well-structured markdown: headings, lists, tables, bold for key terms.
- When writing general code examples, ALWAYS use fenced code blocks with a language tag. Pick the best language for the task; explain why if non-obvious.
- Cite sources when you used a tool. Be honest about uncertainty.
- Default language: respond in the user's language (Spanish, English, etc. based on user prompt).

CRITICAL BUILD APPS INSTRUCTIONS:
When the user asks to build, create, generate, prototype, or code an application, website, component, interactive dashboard, tool, game, or project:
1. **ALWAYS use the \`build_app\` tool!** Do not just dump raw markdown code blocks for full apps when you can give them a live interactive preview with \`build_app\`.
2. Provide clean, complete, fully working multi-file source code inside the \`files\` parameter of \`build_app\`.
3. For React (\`template: "react"\`):
   - Include files such as \`src/App.tsx\` or \`App.tsx\`, and any child components (e.g., \`src/components/Header.tsx\`, \`src/components/Card.tsx\`), plus \`styles.css\` if custom styles are needed.
   - You can use \`lucide-react\` icons, \`recharts\` for charts, and \`tailwindcss\` classes directly.
4. For HTML / Vanilla JS (\`template: "html-js"\`):
   - Include \`index.html\`, \`styles.css\`, and \`app.js\` (or standalone \`index.html\` with embedded CSS/JS).
5. If the user asks to edit, modify, or add features to a previously generated or existing app, use the \`edit_app\` tool with updated files.

CRITICAL VISUALIZATION & DATA INSTRUCTIONS:
- When the user asks for a diagram, flowchart, sequence diagram, or system architecture layout, use the \`generate_diagram\` tool with Mermaid syntax.
- When the user provides tabular data, CSV, or asks for numerical chart analysis (bar chart, line chart, pie chart), use the \`analyze_tabular_data\` tool.`;

const AGENT_ADDENDUM = `

AGENT MODE IS ACTIVE
You may call tools to gather information and complete tasks autonomously:
- web_search: search the public web for fresh information
- fetch_url: download the text content of a URL
- create_plan: emit a structured plan that the UI will render specially
- run_calculation: evaluate a math expression safely
- build_app: generate a multi-file interactive application with live sandbox preview
- edit_app: modify an existing application's code and capabilities
- generate_diagram: generate an interactive architecture, flowchart, sequence, or state diagram
- analyze_tabular_data: create interactive bar/line/pie visualizations and sortable data tables

Workflow for complex tasks:
1. Call create_plan with concrete steps.
2. Execute steps using tools as needed (chain multiple tool calls).
3. Synthesize a final answer that references what you found.
Always finish with a clear, written answer for the user.`;

interface ValidatedRequest {
  messages: UIMessage[];
  agentMode: boolean;
  threadId: string;
}

function getMessagesFromPayload(payload: unknown): UIMessage[] | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const body = payload as Record<string, unknown>;
  if (Array.isArray(body.messages)) return body.messages as UIMessage[];
  const nested = body.body;
  if (
    nested &&
    typeof nested === "object" &&
    Array.isArray((nested as Record<string, unknown>).messages)
  ) {
    return (nested as Record<string, unknown>).messages as UIMessage[];
  }
  return undefined;
}

function validateRequest(payload: unknown): ValidatedRequest {
  if (!payload || typeof payload !== "object") {
    throw Errors.invalidRequest("Invalid request payload");
  }

  const body = payload as Record<string, unknown>;
  const messages = getMessagesFromPayload(payload);
  const agentMode = (body.agentMode as boolean) ?? false;
  const threadId = (body.threadId as string) ?? "";

  if (!Array.isArray(messages) || messages.length === 0) {
    throw Errors.validation("Messages required and must not be empty");
  }

  if (!threadId || typeof threadId !== "string") {
    throw Errors.validation("Valid threadId required");
  }

  // Basic thread ID format validation
  try {
    z.string().uuid().parse(threadId);
  } catch {
    throw Errors.validation("Invalid threadId format");
  }

  return { messages, agentMode, threadId };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const startTime = Date.now();
          const payload = await request.json().catch(() => ({}));

          // Validate request
          const { messages, agentMode, threadId } = validateRequest(payload);

          // Extract user ID from header (set by auth middleware)
          const userId =
            request.headers.get("x-user-id") || request.headers.get("authorization")?.split(" ")[1];

          if (!userId) {
            return createErrorResponse(Errors.auth("User ID required"), 401);
          }

          // Rate limiting
          const rateLimitKey = getRateLimitKey(userId, "/api/chat");
          const rateLimitResult = checkRateLimit(rateLimitKey, {
            maxRequests: 30,
            windowMs: 60 * 1000,
          });

          if (!rateLimitResult.allowed) {
            logInfo("Rate limit exceeded", { userId, key: rateLimitKey });
            return createErrorResponse(Errors.rateLimited(rateLimitResult.resetIn), 429);
          }

          const key = process.env.LOVABLE_API_KEY;
          if (!key) {
            return createErrorResponse(Errors.internal("Missing LOVABLE_API_KEY"));
          }

          const gateway = createLovableAiGatewayProvider(key);
          const model = gateway("google/gemini-3-flash-preview");

          // Check for custom instructions set by user personalization settings
          const customInstructions = request.headers.get("x-custom-instructions") || "";

          // Get available tools from plugin system
          const tools = getAvailableTools(agentMode);

          logInfo("Chat request", {
            userId,
            threadId,
            messageCount: messages.length,
            agentMode,
            hasCustomInstructions: Boolean(customInstructions),
            rateLimitRemaining: rateLimitResult.remaining,
          });

          const fullSystemPrompt =
            SYSTEM_BASE +
            (customInstructions ? `\n\nUSER PERSONAL INSTRUCTIONS:\n${customInstructions}` : "") +
            (agentMode ? AGENT_ADDENDUM : "");

          const result = streamText({
            model,
            system: fullSystemPrompt,
            messages: await convertToModelMessages(messages),
            tools: Object.keys(tools).length > 0 ? tools : undefined,
            stopWhen: stepCountIs(50),
          });

          const response = result.toUIMessageStreamResponse({
            originalMessages: messages,
          });

          // Add rate limit headers
          response.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));
          response.headers.set("X-RateLimit-Reset-In", String(rateLimitResult.resetIn));

          const duration = Date.now() - startTime;
          logInfo("Chat response streamed", { userId, threadId, duration });

          return response;
        } catch (error) {
          if (error instanceof Errors.auth) {
            return createErrorResponse(error, 401);
          }
          if (error instanceof Errors.validation) {
            return createErrorResponse(error, 400);
          }
          logError(error, { context: "POST /api/chat" });
          return createErrorResponse(error, 500);
        }
      },
    },
  },
});
