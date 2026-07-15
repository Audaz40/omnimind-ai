import { useState } from "react";
import type { AppManifest, AppFile } from "@/lib/apps.types";
import { LivePreviewSandbox } from "./LivePreviewSandbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Code2, Play, Download, Copy, Check, FileCode, Plus, Trash2, Sparkles, X, ExternalLink } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { exportAppAsZipOrDownload, saveAppToWorkspace } from "@/lib/apps-storage";
import { toast } from "sonner";

interface Props {
  app: AppManifest | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateApp?: (updatedApp: AppManifest) => void;
  onAskNova?: (prompt: string) => void;
}

export function AppStudioModal({ app, isOpen, onClose, onUpdateApp, onAskNova }: Props) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [novaPrompt, setNovaPrompt] = useState("");

  if (!app) return null;

  const currentFile: AppFile | undefined = app.files[activeFileIndex] || app.files[0];

  const handleStartEdit = () => {
    if (!currentFile) return;
    setEditedContent(currentFile.content);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!currentFile) return;
    const updatedFiles = [...app.files];
    updatedFiles[activeFileIndex] = {
      ...currentFile,
      content: editedContent,
    };
    const updatedApp: AppManifest = {
      ...app,
      files: updatedFiles,
      updatedAt: new Date().toISOString(),
    };
    saveAppToWorkspace(updatedApp);
    onUpdateApp?.(updatedApp);
    setIsEditing(false);
    toast.success("File saved and live preview updated!");
  };

  const handleCopyCode = () => {
    if (!currentFile) return;
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Code copied to clipboard!");
  };

  const handleAskChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaPrompt.trim() || !onAskNova) return;
    onAskNova(`Modify the app "${app.title}" (${app.appId || "ID"}): ${novaPrompt.trim()}`);
    setNovaPrompt("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0 bg-background border-border overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Code2 className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold truncate flex items-center gap-2">
                <span>{app.title}</span>
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                  {app.template}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate max-w-xl">
                {app.description}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex bg-muted p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
                  activeTab === "preview"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Play className="size-3.5 text-primary" />
                Live Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("code")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
                  activeTab === "code"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Code2 className="size-3.5 text-blue-500" />
                Code Explorer ({app.files.length})
              </button>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => exportAppAsZipOrDownload(app)}
              className="h-8 gap-1.5 text-xs"
            >
              <Download className="size-3.5" />
              Export Manifest
            </Button>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="size-8 rounded-full"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {activeTab === "preview" ? (
            <div className="flex-1 flex flex-col p-4 bg-zinc-950/40">
              <LivePreviewSandbox app={app} />
            </div>
          ) : (
            <div className="flex-1 flex min-w-0">
              {/* File Tree Sidebar */}
              <div className="w-64 border-r bg-muted/20 flex flex-col shrink-0">
                <div className="p-3 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Project Files</span>
                  <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">
                    {app.files.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {app.files.map((file, idx) => (
                    <button
                      key={file.path + idx}
                      type="button"
                      onClick={() => {
                        setActiveFileIndex(idx);
                        setIsEditing(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition text-left ${
                        activeFileIndex === idx
                          ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <FileCode className="size-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{file.path}</span>
                    </button>
                  ))}
                </div>
                {app.dependencies && app.dependencies.length > 0 && (
                  <div className="p-3 border-t bg-muted/10 text-[11px]">
                    <div className="font-semibold text-muted-foreground mb-1.5">Dependencies:</div>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(app.dependencies) ? app.dependencies : Object.keys(app.dependencies)).map((d, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Code Editor / Viewer Area */}
              <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e2e]">
                {currentFile ? (
                  <>
                    <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/10 text-xs">
                      <div className="flex items-center gap-2">
                        <FileCode className="size-4 text-blue-400" />
                        <span className="font-mono text-zinc-200 font-semibold">{currentFile.path}</span>
                        {currentFile.description && (
                          <span className="text-zinc-400 hidden sm:inline text-[11px]">
                            — {currentFile.description}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setIsEditing(false)}
                              className="h-7 text-xs text-zinc-300 hover:text-white"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                              Save Changes
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleStartEdit}
                              className="h-7 text-xs text-zinc-300 hover:text-white border border-white/10"
                            >
                              Edit Code
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCopyCode}
                              className="h-7 text-xs text-zinc-300 hover:text-white border border-white/10 flex items-center gap-1.5"
                            >
                              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                              {copied ? "Copied" : "Copy"}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                      {isEditing ? (
                        <textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="w-full h-full p-4 bg-[#1e1e2e] text-zinc-100 font-mono text-xs resize-none border-0 focus:outline-none focus:ring-0 leading-relaxed"
                          spellCheck={false}
                        />
                      ) : (
                        <SyntaxHighlighter
                          language={currentFile.language || "tsx"}
                          style={oneDark}
                          customStyle={{
                            margin: 0,
                            padding: "1.25rem",
                            background: "transparent",
                            fontSize: "0.85rem",
                          }}
                          wrapLongLines
                        >
                          {currentFile.content}
                        </SyntaxHighlighter>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
                    No file selected
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ask NOVA Footer bar */}
        {onAskNova && (
          <form onSubmit={handleAskChange} className="p-3 border-t bg-card flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-primary shrink-0">
              <Sparkles className="size-4" />
              <span>Ask NOVA to Modify:</span>
            </div>
            <input
              type="text"
              value={novaPrompt}
              onChange={(e) => setNovaPrompt(e.target.value)}
              placeholder="e.g. 'Add a search bar to filter tasks', 'Add dark mode toggle', 'Make the layout responsive'"
              className="flex-1 text-xs bg-muted/60 border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!novaPrompt.trim()}
              className="h-8 text-xs bg-primary text-primary-foreground"
            >
              Modify with AI
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
