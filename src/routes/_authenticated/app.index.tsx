import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createThread } from "@/lib/threads.functions";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  component: AppIndex,
});

function AppIndex() {
  const navigate = useNavigate();
  const create = useServerFn(createThread);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    create({ data: {} })
      .then(({ id }) => navigate({ to: "/app/c/$threadId", params: { threadId: id }, replace: true }))
      .catch(() => {});
  }, [create, navigate]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <Sparkles className="size-8 mx-auto text-primary animate-pulse" />
        <p className="mt-3 text-muted-foreground">Preparing your chat…</p>
      </div>
    </div>
  );
}
