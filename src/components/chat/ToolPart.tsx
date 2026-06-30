import { useState } from "react";
import {
  ChevronDown,
  Search,
  Globe,
  ListChecks,
  Calculator,
  Wrench,
  Loader2,
  CheckCircle2,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  web_search: Search,
  fetch_url: Globe,
  create_plan: ListChecks,
  run_calculation: Calculator,
};

export function ToolPart({
  name,
  state,
  input,
  output,
}: {
  name: string;
  state: string;
  input?: unknown;
  output?: unknown;
}) {
  const [open, setOpen] = useState(false);
  const Icon = ICONS[name] ?? Wrench;
  const done = state === "output-available" || state === "result";
  const error = state === "output-error" || state === "error";

  // Plan: render specially
  if (name === "create_plan" && input && typeof input === "object") {
    const { goal, steps } = input as { goal?: string; steps?: string[] };
    return (
      <div className="my-3 rounded-xl border bg-accent/40 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="size-4 text-primary" /> Plan
        </div>
        {goal && <div className="mt-1 text-sm text-muted-foreground">{goal}</div>}
        {Array.isArray(steps) && (
          <ol className="mt-3 space-y-1.5">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 size-5 shrink-0 rounded-full bg-secondary text-primary text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  // Web search: render results inline
  if (name === "web_search" && done && output && typeof output === "object") {
    const { results, query } = output as {
      results?: Array<{ title: string; url: string; snippet: string }>;
      query?: string;
    };
    return (
      <div className="my-3 rounded-xl border bg-card/60 p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Search className="size-3.5" /> Searched: <span className="text-foreground">{query}</span>
        </div>
        <div className="mt-2 space-y-2">
          {results?.slice(0, 5).map((r, i) => (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg p-2 hover:bg-accent/50 transition"
            >
              <div className="text-sm font-medium text-primary truncate">{r.title}</div>
              <div className="text-xs text-muted-foreground truncate">
                {new URL(r.url).hostname}
              </div>
              <div className="text-xs mt-0.5 line-clamp-2">{r.snippet}</div>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="my-2 rounded-lg border bg-card/40 text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2"
      >
        <Icon className="size-3.5" />
        <span className="font-medium">{name}</span>
        {!done && !error && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
        {done && <CheckCircle2 className="size-3 text-emerald-500" />}
        <ChevronDown className={`size-3 ml-auto transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {input != null && (
            <pre className="text-[10px] bg-muted rounded p-2 overflow-x-auto">
              {JSON.stringify(input, null, 2)}
            </pre>
          )}
          {output != null && (
            <pre className="text-[10px] bg-muted rounded p-2 overflow-x-auto">
              {JSON.stringify(output, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
