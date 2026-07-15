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
  Layers,
  Code2,
  GitGraph,
  BarChart3,
} from "lucide-react";
import { AppWorkspaceCard } from "@/components/apps/AppWorkspaceCard";
import { MermaidViewer, type DiagramPayload } from "@/components/chat/MermaidViewer";
import { DataAnalyticsViewer, type DataAnalysisPayload } from "@/components/chat/DataAnalyticsViewer";
import type { AppManifest } from "@/lib/apps.types";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  web_search: Search,
  fetch_url: Globe,
  create_plan: ListChecks,
  run_calculation: Calculator,
  build_app: Layers,
  edit_app: Code2,
  generate_diagram: GitGraph,
  analyze_tabular_data: BarChart3,
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

  // Build / Edit App: Render rich interactive App Workspace & Sandbox Card
  if (name === "build_app" || name === "edit_app") {
    const appPayload = (done && output && typeof output === "object" ? output : input) as Partial<AppManifest> | undefined;

    if (appPayload && typeof appPayload === "object" && appPayload.title && Array.isArray(appPayload.files) && appPayload.files.length > 0) {
      return (
        <div className="w-full">
          {!done && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-primary bg-primary/10 rounded-xl mb-2 animate-pulse">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Building Interactive Application ({appPayload.files.length} files)…</span>
            </div>
          )}
          <AppWorkspaceCard
            app={{
              appId: appPayload.appId || `app-${Date.now()}`,
              title: appPayload.title || "Untitled App",
              description: appPayload.description || "Interactive AI App",
              template: appPayload.template || "web-app",
              files: appPayload.files,
              entryPoint: appPayload.entryPoint,
              dependencies: appPayload.dependencies,
              instructions: appPayload.instructions,
            }}
            onAskNova={(prompt) => {
              window.dispatchEvent(new CustomEvent("nova:ask-change", { detail: { prompt } }));
            }}
          />
        </div>
      );
    }

    if (!done && !error) {
      return (
        <div className="my-3 rounded-2xl border border-primary/20 bg-card/60 p-4 flex items-center gap-3">
          <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Loader2 className="size-4 text-primary animate-spin" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">
              {name === "build_app" ? "Generating Application Workspace & Files…" : "Applying Code Modifications…"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Creating multi-file code sandbox and live preview environment…
            </div>
          </div>
        </div>
      );
    }
  }

  // Diagram generation: Render interactive Mermaid SVG viewer
  if (name === "generate_diagram") {
    const diagPayload = (done && output && typeof output === "object" ? output : input) as Partial<DiagramPayload> | undefined;
    if (diagPayload && typeof diagPayload === "object" && diagPayload.code) {
      return (
        <div className="w-full">
          {!done && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-purple-400 bg-purple-500/10 rounded-lg mb-2 animate-pulse">
              <Loader2 className="size-3 animate-spin" />
              <span>Rendering diagram ({diagPayload.diagramType || "flowchart"})…</span>
            </div>
          )}
          <MermaidViewer
            payload={{
              title: diagPayload.title || "Interactive Diagram",
              code: diagPayload.code,
              diagramType: diagPayload.diagramType || "flowchart",
              description: diagPayload.description,
            }}
          />
        </div>
      );
    }
  }

  // Tabular Data Analysis: Render interactive Recharts / Data table
  if (name === "analyze_tabular_data") {
    const dataPayload = (done && output && typeof output === "object" ? output : input) as Partial<DataAnalysisPayload> | undefined;
    if (dataPayload && typeof dataPayload === "object" && Array.isArray(dataPayload.data) && dataPayload.data.length > 0) {
      return (
        <div className="w-full">
          {!done && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-primary bg-primary/10 rounded-lg mb-2 animate-pulse">
              <Loader2 className="size-3 animate-spin" />
              <span>Analyzing data and building visualizations…</span>
            </div>
          )}
          <DataAnalyticsViewer
            payload={{
              title: dataPayload.title || "Data Analysis",
              summary: dataPayload.summary || "",
              chartType: dataPayload.chartType || "bar",
              xAxisKey: dataPayload.xAxisKey || Object.keys(dataPayload.data[0])[0],
              dataKeys: dataPayload.dataKeys || [Object.keys(dataPayload.data[0])[1]],
              data: dataPayload.data,
            }}
          />
        </div>
      );
    }
  }

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
