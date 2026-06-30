import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { saveMessages, setAgentMode } from "@/lib/threads.functions";
import { Markdown } from "./Markdown";
import { ToolPart } from "./ToolPart";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Send, Sparkles, Square, Bot, User as UserIcon, Zap } from "lucide-react";
import { toast } from "sonner";

type Props = {
  threadId: string;
  initialMessages: UIMessage[];
  initialAgentMode: boolean;
};

export function ChatWindow({ threadId, initialMessages, initialAgentMode }: Props) {
  const [agentMode, setAgent] = useState(initialAgentMode);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const persist = useServerFn(saveMessages);
  const updateAgent = useServerFn(setAgentMode);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: threadId,
    messages: initialMessages ?? [],
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ agentMode, threadId }),
    }),
    onError: (e) => toast.error(e.message),
    onFinish: async ({ messages: finalMessages }) => {
      try {
        await persist({
          data: {
            threadId,
            messages: finalMessages.map((m) => ({
              role: m.role as "user" | "assistant" | "system",
              parts: m.parts as unknown as unknown[],
            })),
          },
        });
      } catch (e) {
        console.error("persist failed", e);
      }
    },
  });

  // Reset when thread changes
  useEffect(() => {
    setMessages(initialMessages);
    setAgent(initialAgentMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // Autoscroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  // Focus textarea
  useEffect(() => {
    if (status === "ready") taRef.current?.focus();
  }, [status, threadId]);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || status === "submitted" || status === "streaming") return;
    setInput("");
    await sendMessage({ text });
  };

  const toggleAgent = async (v: boolean) => {
    setAgent(v);
    try {
      await updateAgent({ data: { threadId, agentMode: v } });
    } catch {
      /* noop */
    }
  };

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <div className="flex-1 flex flex-col h-full">
      <header className="h-14 border-b flex items-center justify-between px-5 bg-background">
        <div className="flex items-center gap-3">
          <div className="size-7 rounded-lg bg-muted flex items-center justify-center">
            <Sparkles className="size-3.5 text-primary" />
          </div>
          <div>
            <div className="font-semibold">NOVA</div>
            <div className="text-xs text-muted-foreground">Gemini 3 Flash</div>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <Zap className={`size-4 ${agentMode ? "text-primary" : "text-muted-foreground"}`} />
          <span className={agentMode ? "text-foreground" : "text-muted-foreground"}>
            Agent mode
          </span>
          <Switch checked={agentMode} onCheckedChange={toggleAgent} />
        </label>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 py-8 space-y-8">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <div className="size-16 mx-auto rounded-3xl bg-muted flex items-center justify-center">
                <Sparkles className="size-7 text-primary" />
              </div>
              <h2 className="mt-6 text-3xl font-semibold tracking-tight">
                How can I help you today?
              </h2>
              <p className="mt-2 text-muted-foreground">
                {agentMode
                  ? "Agent mode is on — I can search the web, fetch URLs, plan and execute."
                  : "Ask anything. Turn on Agent mode for web search & multi-step tasks."}
              </p>
              <div className="mt-8 grid sm:grid-cols-2 gap-2 text-left">
                {[
                  "Write a Rust web server with axum and serve a JSON API",
                  "Compare Python, Go, and TypeScript for building a CLI",
                  "Explain transformers like I'm a senior engineer",
                  "Plan a 5-day trip to Tokyo for a foodie on $2000",
                ].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setInput(p);
                      taRef.current?.focus();
                    }}
                    className="rounded-xl border p-3 text-sm hover:bg-accent text-muted-foreground hover:text-foreground transition text-left"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageView key={m.id} message={m} />
          ))}

          {status === "submitted" && (
            <div className="flex items-start gap-3">
              <Avatar role="assistant" />
              <div className="dot-pulse text-muted-foreground pt-2 text-2xl leading-none">
                <span>·</span>
                <span>·</span>
                <span>·</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t bg-background">
        <form onSubmit={onSubmit} className="max-w-3xl mx-auto p-4">
          <div className="relative rounded-2xl border bg-card focus-within:ring-2 focus-within:ring-ring transition">
            <Textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              placeholder={agentMode ? "Ask NOVA to research, plan, or build…" : "Message NOVA…"}
              rows={1}
              className="min-h-[56px] max-h-[300px] resize-none border-0 bg-transparent pr-14 py-4 px-4 focus-visible:ring-0 shadow-none"
            />
            <div className="absolute right-2 bottom-2">
              {isLoading ? (
                <Button type="button" size="icon" variant="secondary" onClick={() => stop()}>
                  <Square className="size-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim()}
                  className="bg-primary text-primary-foreground border-0"
                >
                  <Send className="size-4" />
                </Button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            NOVA can make mistakes. Verify important info. Free · Powered by Lovable AI.
          </p>
        </form>
      </div>
    </div>
  );
}

function Avatar({ role }: { role: "user" | "assistant" | "system" }) {
  if (role === "user") {
    return (
      <div className="size-8 shrink-0 rounded-full bg-secondary flex items-center justify-center">
        <UserIcon className="size-4 text-primary" />
      </div>
    );
  }
  return (
    <div className="size-8 shrink-0 rounded-full bg-muted flex items-center justify-center">
      <Bot className="size-4 text-primary" />
    </div>
  );
}

type AnyPart = {
  type: string;
  text?: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
};

function MessageView({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const parts = message.parts as unknown as AnyPart[];

  return (
    <div className="flex items-start gap-3">
      <Avatar role={message.role as "user" | "assistant" | "system"} />
      <div className="flex-1 min-w-0 pt-1">
        <div className="text-xs font-medium text-muted-foreground mb-1">
          {isUser ? "You" : "NOVA"}
        </div>
        {parts.map((p, i) => {
          if (p.type === "text") {
            return isUser ? (
              <div
                key={i}
                className="inline-block rounded-2xl bg-primary text-primary-foreground px-4 py-2 whitespace-pre-wrap"
              >
                {p.text}
              </div>
            ) : (
              <Markdown key={i} content={p.text ?? ""} />
            );
          }
          if (p.type?.startsWith("tool-")) {
            const name = p.type.replace(/^tool-/, "");
            return (
              <ToolPart
                key={i}
                name={name}
                state={p.state ?? ""}
                input={p.input}
                output={p.output}
              />
            );
          }
          if (p.type === "reasoning" && p.text) {
            return (
              <details key={i} className="my-2 text-xs text-muted-foreground">
                <summary className="cursor-pointer">Thinking…</summary>
                <div className="mt-1 whitespace-pre-wrap">{p.text}</div>
              </details>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
