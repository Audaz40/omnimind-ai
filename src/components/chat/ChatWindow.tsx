import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState, useId } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { saveMessages, setAgentMode, createThread } from "@/lib/threads.functions";
import { Markdown } from "./Markdown";
import { ToolPart } from "./ToolPart";
import { AppsGalleryModal } from "@/components/apps/AppsGalleryModal";
import { UserSettingsModal } from "@/components/chat/UserSettingsModal";
import { getNovaSettings } from "@/lib/settings-storage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Send,
  Sparkles,
  Square,
  Bot,
  User as UserIcon,
  Zap,
  Layers,
  Settings,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  GitFork,
  Download,
} from "lucide-react";
import { toast } from "sonner";

type Props = {
  threadId: string;
  initialMessages: UIMessage[];
  initialAgentMode: boolean;
};

export function ChatWindow({ threadId, initialMessages, initialAgentMode }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [agentMode, setAgent] = useState(initialAgentMode);
  const [input, setInput] = useState("");
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const persist = useServerFn(saveMessages);
  const updateAgent = useServerFn(setAgentMode);
  const createNewThread = useServerFn(createThread);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: threadId,
    messages: initialMessages ?? [],
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: () => {
        const settings = getNovaSettings();
        return {
          "x-custom-instructions": settings.customInstructions || "",
        };
      },
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
    setSpeakingMsgId(null);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // Listen for auto-send prompts from App Studio or Sandbox modifications
  useEffect(() => {
    const handleAskChange = (e: Event) => {
      const prompt = (e as CustomEvent).detail?.prompt;
      if (!prompt) return;
      if (status === "ready") {
        sendMessage({ text: prompt });
      } else {
        setInput(prompt);
        taRef.current?.focus();
      }
    };
    window.addEventListener("nova:ask-change", handleAskChange);
    return () => window.removeEventListener("nova:ask-change", handleAskChange);
  }, [status, sendMessage]);

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

  // Voice Speech Recognition (STT)
  const toggleSpeechInput = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as unknown as Record<string, any>).SpeechRecognition ||
      (window as unknown as Record<string, any>).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = getNovaSettings().voiceLanguage === "auto" ? "es-ES" : getNovaSettings().voiceLanguage;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join(" ");
        setInput(transcript);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      toast.error("Failed to start voice recognition.");
    }
  };

  // Voice Narration (TTS)
  const handleSpeakMessage = (msgId: string, text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#`_~[\]()]/g, " "));
    const settings = getNovaSettings();
    if (settings.voiceLanguage !== "auto") {
      utterance.lang = settings.voiceLanguage;
    }
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Fork conversation branch
  const handleForkChat = async (targetIndex: number) => {
    try {
      const sliced = messages.slice(0, targetIndex + 1);
      const { id: newId } = await createNewThread({ data: { agentMode } });
      await persist({
        data: {
          threadId: newId,
          messages: sliced.map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            parts: m.parts as unknown as unknown[],
          })),
        },
      });
      await qc.invalidateQueries({ queryKey: ["threads"] });
      toast.success("Forked conversation successfully!");
      navigate({ to: "/app/c/$threadId", params: { threadId: newId } });
    } catch (e) {
      toast.error("Failed to fork conversation: " + (e as Error).message);
    }
  };

  // Export chat
  const handleExportChat = (format: "md" | "json") => {
    if (messages.length === 0) {
      toast.error("No messages to export.");
      return;
    }

    if (format === "json") {
      const blob = new Blob([JSON.stringify(messages, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nova-chat-${threadId.substring(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const md = messages
        .map((m) => {
          const role = m.role === "user" ? "### 👤 You" : "### 🤖 NOVA";
          const text = (m.parts as unknown as Array<{ type: string; text?: string }>)
            .filter((p) => p.type === "text")
            .map((p) => p.text || "")
            .join("\n\n");
          return `${role}\n\n${text}`;
        })
        .join("\n\n---\n\n");

      const blob = new Blob([`# NOVA AI Conversation Report\n**Date:** ${new Date().toLocaleString()}\n\n---\n\n${md}`], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nova-chat-${threadId.substring(0, 8)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success(`Exported chat as .${format}!`);
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
            <div className="font-semibold flex items-center gap-2">
              <span>NOVA</span>
              <span className="text-[10px] font-mono uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                App Builder & Analytics Enabled
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Gemini 3 Flash</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 border-r pr-3 border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleExportChat("md")}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
              title="Export as Markdown report"
            >
              <Download className="size-3.5" />
              <span>Export .md</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsGalleryOpen(true)}
              className="h-8 gap-1.5 text-xs border-primary/30 hover:border-primary/60 hover:bg-primary/10 text-primary font-medium shadow-sm transition"
            >
              <Layers className="size-3.5" />
              <span>App Studio</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="size-8 p-0 text-muted-foreground hover:text-foreground"
              title="Personalization Settings"
            >
              <Settings className="size-4" />
            </Button>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Zap className={`size-4 ${agentMode ? "text-primary" : "text-muted-foreground"}`} />
            <span className={agentMode ? "text-foreground" : "text-muted-foreground"}>
              Agent mode
            </span>
            <Switch checked={agentMode} onCheckedChange={toggleAgent} />
          </label>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 py-8 space-y-8">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="size-16 mx-auto rounded-3xl bg-muted flex items-center justify-center relative shadow-inner">
                <Sparkles className="size-7 text-primary" />
                <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shadow">
                  <Layers className="size-3.5" />
                </div>
              </div>
              <h2 className="mt-6 text-3xl font-semibold tracking-tight">
                How can I help you build today?
              </h2>
              <p className="mt-2 text-muted-foreground max-w-xl mx-auto text-xs sm:text-sm">
                {agentMode
                  ? "Agent mode is on — I can search the web, fetch URLs, plan, build interactive multi-file apps, and render charts & diagrams."
                  : "Ask anything, or ask me to build a complete interactive web application with live sandbox preview!"}
              </p>
              <div className="mt-8 grid sm:grid-cols-2 gap-2.5 text-left">
                {[
                  "⚡ Build App: Interactive Todo & Kanban Board with React + Tailwind",
                  "🎮 Build App: Retro Snake Arcade Game with High Score in HTML5 Canvas",
                  "📊 Analyze Data: Create a bar chart comparing top 5 programming languages",
                  "📈 Generate Diagram: Show system architecture of a scalable Next.js cloud app",
                ].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setInput(p);
                      taRef.current?.focus();
                    }}
                    className="group rounded-xl border p-3.5 text-xs hover:border-primary/40 hover:bg-accent/50 text-muted-foreground hover:text-foreground transition text-left flex items-start gap-2.5"
                  >
                    <Sparkles className="size-4 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition" />
                    <span className="font-medium leading-relaxed">{p}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, index) => (
            <MessageView
              key={m.id}
              message={m}
              index={index}
              isSpeaking={speakingMsgId === m.id}
              onSpeak={(text) => handleSpeakMessage(m.id, text)}
              onFork={() => handleForkChat(index)}
            />
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
          <div className="relative rounded-2xl border bg-card focus-within:ring-2 focus-within:ring-ring transition flex items-center">
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
              placeholder={
                isListening
                  ? "Listening to microphone speech..."
                  : agentMode
                  ? "Ask NOVA to research, plan, build an app, or analyze data…"
                  : "Message NOVA (try 'build a todo app in React')…"
              }
              rows={1}
              className="flex-1 min-h-[56px] max-h-[300px] resize-none border-0 bg-transparent pr-24 py-4 px-4 focus-visible:ring-0 shadow-none"
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant={isListening ? "destructive" : "ghost"}
                onClick={toggleSpeechInput}
                className="size-8 rounded-full"
                title={isListening ? "Stop listening" : "Speak input via microphone"}
              >
                {isListening ? <MicOff className="size-4 animate-pulse" /> : <Mic className="size-4 text-muted-foreground" />}
              </Button>

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
          <p className="text-[11px] text-muted-foreground text-center mt-2 flex items-center justify-center gap-1.5">
            <span>NOVA can make mistakes. Verify important info.</span>
            <span>·</span>
            <button
              type="button"
              onClick={() => setIsGalleryOpen(true)}
              className="text-primary hover:underline font-medium"
            >
              Saved Apps Gallery
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="text-muted-foreground hover:text-foreground underline"
            >
              Settings
            </button>
          </p>
        </form>
      </div>

      <AppsGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onSelectStarterPrompt={(prompt) => {
          setInput(prompt);
          taRef.current?.focus();
        }}
      />

      <UserSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
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

interface MessageViewProps {
  message: UIMessage;
  index: number;
  isSpeaking: boolean;
  onSpeak: (text: string) => void;
  onFork: () => void;
}

function MessageView({ message, index, isSpeaking, onSpeak, onFork }: MessageViewProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const parts = message.parts as unknown as AnyPart[];

  const fullText = parts
    .filter((p) => p.type === "text")
    .map((p) => p.text || "")
    .join("\n");

  const copyMessage = () => {
    if (!fullText) return;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Message copied to clipboard!");
  };

  return (
    <div className="group flex items-start gap-3">
      <Avatar role={message.role as "user" | "assistant" | "system"} />
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="text-xs font-medium text-muted-foreground">
            {isUser ? "You" : "NOVA"}
          </div>

          {/* Action toolbar on hover */}
          <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 bg-muted/60 px-1.5 py-0.5 rounded-md text-[11px] text-muted-foreground">
            {fullText && (
              <>
                <button
                  type="button"
                  onClick={() => onSpeak(fullText)}
                  className="p-1 hover:text-foreground transition rounded"
                  title={isSpeaking ? "Stop speaking" : "Read aloud (TTS)"}
                >
                  {isSpeaking ? <VolumeX className="size-3 text-primary animate-pulse" /> : <Volume2 className="size-3" />}
                </button>
                <button
                  type="button"
                  onClick={copyMessage}
                  className="p-1 hover:text-foreground transition rounded"
                  title="Copy message text"
                >
                  {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onFork}
              className="p-1 hover:text-foreground transition rounded"
              title="Fork conversation from this message"
            >
              <GitFork className="size-3" />
            </button>
          </div>
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
                <summary className="cursor-pointer font-medium hover:text-foreground">Thinking Process & Tracing…</summary>
                <div className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/40 p-3 font-mono text-[11px] border border-border/50">
                  {p.text}
                </div>
              </details>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
