import { useState, useEffect } from "react";
import type { AppManifest } from "@/lib/apps.types";
import { LivePreviewSandbox } from "./LivePreviewSandbox";
import { AppStudioModal } from "./AppStudioModal";
import { Button } from "@/components/ui/button";
import { Code2, Play, Maximize2, Download, Check, Sparkles, FolderGit2, Layers } from "lucide-react";
import { exportAppAsZipOrDownload, saveAppToWorkspace } from "@/lib/apps-storage";
import { toast } from "sonner";

interface Props {
  app: AppManifest;
  onAskNova?: (prompt: string) => void;
}

export function AppWorkspaceCard({ app: initialApp, onAskNova }: Props) {
  const [app, setApp] = useState<AppManifest>(initialApp);
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setApp(initialApp);
    // Automatically save newly generated app to user workspace
    if (initialApp.title && initialApp.files?.length > 0) {
      saveAppToWorkspace(initialApp);
    }
  }, [initialApp]);

  const handleCopyCode = () => {
    const mainFile = app.files[0];
    if (!mainFile) return;
    navigator.clipboard.writeText(mainFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Main code copied to clipboard!");
  };

  return (
    <div className="my-4 rounded-2xl border border-primary/30 bg-card/90 shadow-lg overflow-hidden transition-all hover:border-primary/50">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/10 via-muted/40 to-background border-b gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm font-bold">
            <Layers className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{app.title || "Untitled Application"}</span>
              <span className="text-[10px] font-mono tracking-wide uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                {app.template || "web-app"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-md mt-0.5">
              {app.description || "Interactive Multi-File Application built by NOVA AI"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <div className="flex bg-muted p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                viewMode === "preview"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Play className="size-3 text-emerald-500" />
              Preview
            </button>
            <button
              type="button"
              onClick={() => setViewMode("code")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                viewMode === "code"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Code2 className="size-3 text-blue-500" />
              Files ({app.files?.length || 0})
            </button>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsModalOpen(true)}
            className="h-8 gap-1.5 text-xs bg-background/80 hover:bg-background"
            title="Open in Fullscreen App Studio"
          >
            <Maximize2 className="size-3.5" />
            <span className="hidden md:inline">Open Studio</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => exportAppAsZipOrDownload(app)}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            title="Download Project Manifest"
          >
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Card Body: Preview Sandbox or Mini Code File list */}
      <div className="p-3 bg-zinc-950/60 min-h-[360px] max-h-[550px] flex flex-col overflow-hidden">
        {viewMode === "preview" ? (
          <div className="flex-1 min-h-[330px]">
            <LivePreviewSandbox app={app} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 p-2 font-mono text-xs">
            {app.files?.map((file, idx) => (
              <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-900/90 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/60 border-b border-zinc-700/50 text-zinc-300">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="size-3.5 text-primary" />
                    <span className="font-semibold">{file.path}</span>
                    <span className="text-[10px] text-zinc-400 uppercase">({file.language})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(file.content);
                      toast.success(`Copied ${file.path}!`);
                    }}
                    className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1"
                  >
                    Copy File
                  </button>
                </div>
                <pre className="p-3 overflow-x-auto text-zinc-200 text-[11px] leading-relaxed max-h-48">
                  {file.content}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer: Quick action or instructions */}
      <div className="px-4 py-2.5 bg-muted/30 border-t flex items-center justify-between text-xs text-muted-foreground">
        <div className="truncate flex items-center gap-2">
          <Sparkles className="size-3.5 text-primary shrink-0" />
          <span className="truncate">{app.instructions || "Your app is ready! Test live interactions in the preview tab above."}</span>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-primary hover:underline font-medium shrink-0 ml-2 flex items-center gap-1"
        >
          Customize in Studio &rarr;
        </button>
      </div>

      {/* Fullscreen Modal Studio */}
      <AppStudioModal
        app={app}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdateApp={(updated) => setApp(updated)}
        onAskNova={onAskNova}
      />
    </div>
  );
}
