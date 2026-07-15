import { useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, MessageSquare, Trash2, LogOut, Sparkles, Layers, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createThread, deleteThread, listThreads } from "@/lib/threads.functions";
import { supabase } from "@/integrations/supabase/client";
import { AppsGalleryModal } from "@/components/apps/AppsGalleryModal";
import { UserSettingsModal } from "@/components/chat/UserSettingsModal";
import { toast } from "sonner";

export function Sidebar() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const params = useParams({ strict: false }) as { threadId?: string };
  const activeId = params.threadId;
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const remove = useServerFn(deleteThread);

  const { data: threads = [] } = useQuery({
    queryKey: ["threads"],
    queryFn: () => list({}),
  });

  const onNew = async () => {
    try {
      const { id } = await create({ data: { agentMode: false } });
      await qc.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/app/c/$threadId", params: { threadId: id } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this conversation?")) return;
    try {
      await remove({ data: { threadId: id } });
      await qc.invalidateQueries({ queryKey: ["threads"] });
      if (activeId === id) navigate({ to: "/app" });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onLogout = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <aside className="w-72 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border">
      <div className="p-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-muted flex items-center justify-center">
            <Sparkles className="size-4 text-primary" />
          </div>
          <span className="font-semibold tracking-tight">NOVA</span>
        </Link>
      </div>
      <div className="px-3 space-y-1.5">
        <Button onClick={onNew} className="w-full bg-primary text-primary-foreground border-0">
          <Plus className="size-4 mr-1" /> New chat
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsGalleryOpen(true)}
          className="w-full border-sidebar-border bg-sidebar-accent/40 hover:bg-sidebar-accent text-sidebar-foreground justify-start gap-2 text-xs"
        >
          <Layers className="size-3.5 text-primary" />
          <span>Apps Studio & Artifacts</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsSettingsOpen(true)}
          className="w-full border-sidebar-border bg-sidebar-accent/20 hover:bg-sidebar-accent text-sidebar-foreground justify-start gap-2 text-xs"
        >
          <Settings className="size-3.5 text-zinc-400" />
          <span>Personalization & Settings</span>
        </Button>
      </div>
      <div className="mt-4 px-2 flex-1 overflow-y-auto">
        <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 px-2 mb-1">
          Recent Chats
        </div>
        <div className="space-y-0.5">
          {threads.map((t) => (
            <div
              key={t.id}
              className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-sidebar-accent text-sm ${
                activeId === t.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground"
              }`}
            >
              <Link
                to="/app/c/$threadId"
                params={{ threadId: t.id }}
                className="flex-1 flex items-center gap-2 min-w-0"
              >
                <MessageSquare className="size-3.5 shrink-0 opacity-60" />
                <span className="truncate flex-1">{t.title}</span>
              </Link>
              <button
                type="button"
                onClick={() => onDelete(t.id)}
                className="opacity-0 group-hover:opacity-100 hover:text-destructive p-1"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {threads.length === 0 && (
            <div className="text-xs text-sidebar-foreground/50 px-2 py-4 text-center">
              No chats yet
            </div>
          )}
        </div>
      </div>
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={onLogout}
          className="w-full justify-start text-sidebar-foreground"
        >
          <LogOut className="size-4 mr-2" /> Sign out
        </Button>
      </div>

      <AppsGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onSelectStarterPrompt={(prompt) => {
          window.dispatchEvent(new CustomEvent("nova:ask-change", { detail: { prompt } }));
        }}
      />

      <UserSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </aside>
  );
}
