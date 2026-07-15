import { useState, useEffect, useRef } from "react";
import { GitGraph, Copy, Check, Maximize2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface DiagramPayload {
  title: string;
  code: string;
  diagramType: "flowchart" | "sequence" | "class" | "state" | "gantt" | "architecture";
  description?: string;
}

export function MermaidViewer({ payload }: { payload: DiagramPayload }) {
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    async function renderMermaid() {
      try {
        setError(null);
        // We load mermaid dynamically from CDN if not already loaded, or use basic structured renderer
        if (typeof window !== "undefined") {
          let mermaid = (window as unknown as Record<string, any>).mermaid;
          if (!mermaid) {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
            document.head.appendChild(script);
            await new Promise((resolve) => {
              script.onload = resolve;
              script.onerror = () => resolve(false);
            });
            mermaid = (window as unknown as Record<string, any>).mermaid;
            if (mermaid) {
              mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });
            }
          }

          if (mermaid && mounted) {
            const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
            const { svg } = await mermaid.render(id, payload.code.trim());
            if (mounted) setSvgContent(svg);
          } else if (mounted) {
            setError("Mermaid engine loading from CDN...");
          }
        }
      } catch (e) {
        if (mounted) {
          setError((e as Error).message || "Diagram syntax rendering warning");
        }
      }
    }
    renderMermaid();
    return () => {
      mounted = false;
    };
  }, [payload.code]);

  const copyCode = () => {
    navigator.clipboard.writeText(payload.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${payload.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "diagram"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-4 rounded-2xl border bg-card/90 overflow-hidden shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b text-xs">
        <div className="flex items-center gap-2 font-semibold">
          <GitGraph className="size-4 text-purple-400" />
          <span>{payload.title || "Architecture / Flow Diagram"}</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
            {payload.diagramType}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setIsModalOpen(true)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            title="Expand Fullscreen"
          >
            <Maximize2 className="size-3.5" />
          </Button>

          {svgContent && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={downloadSvg}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              title="Download SVG"
            >
              <Download className="size-3.5" />
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={copyCode}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 font-mono"
          >
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy Source"}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 bg-zinc-950/60 min-h-[180px] flex flex-col items-center justify-center overflow-x-auto">
        {svgContent ? (
          <div
            ref={containerRef}
            className="w-full flex items-center justify-center py-4"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="w-full space-y-2">
            {error && <div className="text-[11px] text-amber-400 text-center">{error}</div>}
            <pre className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs overflow-x-auto leading-relaxed">
              {payload.code}
            </pre>
          </div>
        )}
        {payload.description && (
          <p className="mt-2 text-xs text-muted-foreground text-center max-w-lg">{payload.description}</p>
        )}
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[90vw] w-[1200px] max-h-[90vh] h-[90vh] flex flex-col overflow-hidden p-6">
          <DialogHeader className="border-b pb-3 shrink-0 flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <GitGraph className="size-5 text-purple-400" />
              <span>{payload.title}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-6 bg-zinc-950 rounded-xl flex items-center justify-center my-4">
            {svgContent ? (
              <div dangerouslySetInnerHTML={{ __html: svgContent }} className="scale-110" />
            ) : (
              <pre className="text-zinc-200 font-mono text-sm">{payload.code}</pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
