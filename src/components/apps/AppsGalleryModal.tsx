import { useState, useEffect } from "react";
import type { AppManifest } from "@/lib/apps.types";
import { getSavedApps, deleteAppFromWorkspace, exportAppAsZipOrDownload } from "@/lib/apps-storage";
import { AppStudioModal } from "./AppStudioModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Layers, Play, Code2, Trash2, Download, Plus, Sparkles, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectStarterPrompt?: (prompt: string) => void;
}

export function AppsGalleryModal({ isOpen, onClose, onSelectStarterPrompt }: Props) {
  const [apps, setApps] = useState<AppManifest[]>([]);
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<AppManifest | null>(null);
  const [isStudioOpen, setIsStudioOpen] = useState(false);

  const loadApps = () => {
    setApps(getSavedApps());
  };

  useEffect(() => {
    if (isOpen) {
      loadApps();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => loadApps();
    window.addEventListener("nova:apps-updated", handleUpdate);
    return () => window.removeEventListener("nova:apps-updated", handleUpdate);
  }, []);

  const handleDelete = (appId?: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!appId || !confirm("Are you sure you want to remove this app from your studio workspace?")) return;
    deleteAppFromWorkspace(appId);
    toast.success("App removed from workspace");
  };

  const filteredApps = apps.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.description?.toLowerCase().includes(search.toLowerCase()) ||
      a.template?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[85vw] w-[1100px] max-h-[85vh] h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b pb-4 shrink-0 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-bold flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <Layers className="size-4.5" />
              </div>
              <span>NOVA App Studio & Artifacts Gallery</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Browse, preview, and edit interactive multi-file applications built by NOVA AI across all your conversations.
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search saved apps..."
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border bg-muted/40 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {filteredApps.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="size-16 rounded-3xl bg-muted mx-auto flex items-center justify-center">
                <Sparkles className="size-7 text-primary" />
              </div>
              <h3 className="mt-4 text-base font-semibold">No Saved Apps Found</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                When you ask NOVA to build apps, interactive tools, dashboards, or games, they are saved here automatically!
              </p>

              {onSelectStarterPrompt && (
                <div className="mt-6 max-w-xl mx-auto">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Start with a Template
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 text-left">
                    {[
                      "⚡ Build App: Todo & Kanban Task Manager with React & Tailwind",
                      "🎮 Build App: Retro Snake Arcade Game with High Score in HTML5",
                      "📊 Build App: Crypto & Stocks Analytics Dashboard with Live Charts",
                      "🎵 Build App: Ambient Pomodoro Focus Timer with Sound Generator",
                    ].map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          onSelectStarterPrompt(prompt);
                          onClose();
                        }}
                        className="p-3 rounded-xl border bg-card hover:bg-accent text-left transition text-xs flex items-start gap-2"
                      >
                        <Sparkles className="size-3.5 text-primary mt-0.5 shrink-0" />
                        <span>{prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApps.map((app) => (
                <div
                  key={app.appId || app.title}
                  onClick={() => {
                    setSelectedApp(app);
                    setIsStudioOpen(true);
                  }}
                  className="group rounded-2xl border bg-card hover:border-primary/50 hover:shadow-lg transition cursor-pointer overflow-hidden flex flex-col justify-between p-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">
                          {app.title.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm truncate group-hover:text-primary transition">
                            {app.title}
                          </h4>
                          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                            {app.template} · {app.files?.length || 0} files
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(app.appId, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                        title="Remove app"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-3 mt-2">
                      {app.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {app.updatedAt ? new Date(app.updatedAt).toLocaleDateString() : "Saved"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          exportAppAsZipOrDownload(app);
                        }}
                        className="h-7 px-2 text-[11px]"
                      >
                        <Download className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 px-2.5 text-[11px] bg-primary text-primary-foreground gap-1"
                      >
                        <Play className="size-3" />
                        <span>Launch Studio</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <AppStudioModal
          app={selectedApp}
          isOpen={isStudioOpen}
          onClose={() => setIsStudioOpen(false)}
          onUpdateApp={(updated) => {
            setSelectedApp(updated);
            loadApps();
          }}
          onAskNova={(prompt) => {
            onClose();
            window.dispatchEvent(new CustomEvent("nova:ask-change", { detail: { prompt } }));
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
