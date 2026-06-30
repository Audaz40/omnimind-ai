import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getThread } from "@/lib/threads.functions";
import { ChatWindow } from "@/components/chat/ChatWindow";
import type { UIMessage } from "ai";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/c/$threadId")({
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const fetcher = useServerFn(getThread);

  const { data, isLoading, error } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => fetcher({ data: { threadId } }),
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-destructive">
        Failed to load chat.
      </div>
    );
  }

  const initialMessages: UIMessage[] = data.messages.map((m) => ({
    id: m.id,
    role: m.role as UIMessage["role"],
    parts: (m.parts as unknown as UIMessage["parts"]) ?? [],
  }));

  return (
    <ChatWindow
      key={threadId}
      threadId={threadId}
      initialMessages={initialMessages}
      initialAgentMode={data.thread.agent_mode}
    />
  );
}
