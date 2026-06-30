import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Brain, Code2, Search, Zap, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NOVA · AI Mode, supercharged" },
      {
        name: "description",
        content: "An advanced AI mode that thinks, plans, and acts. Free to use.",
      },
      { property: "og:title", content: "NOVA · AI Mode, supercharged" },
      {
        property: "og:description",
        content: "An advanced AI mode that thinks, plans, and acts. Free to use.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [hasUser, setHasUser] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setHasUser(!!data.user));
  }, []);

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-muted flex items-center justify-center">
            <Sparkles className="size-4 text-primary" />
          </div>
          <span className="font-semibold text-lg tracking-tight">NOVA</span>
        </div>
        <Button asChild variant="ghost">
          <Link to={hasUser ? "/app" : "/auth"}>{hasUser ? "Open app" : "Sign in"}</Link>
        </Button>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Free, minimalist AI mode
        </div>
        <h1 className="mt-6 text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
          AI mode with clean design and powerful results.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          NOVA thinks before it answers, plans complex tasks, searches the live web, and writes
          production-ready code across 40+ languages.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Button
            size="lg"
            className="h-12 px-7 bg-primary text-primary-foreground border-0"
            onClick={() => navigate({ to: hasUser ? "/app" : "/auth" })}
          >
            Start chatting <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>

        <div className="mt-20 grid md:grid-cols-4 gap-4 text-left">
          {[
            {
              icon: Brain,
              title: "Thinks & plans",
              desc: "Outlines a clear plan before solving hard problems.",
            },
            {
              icon: Search,
              title: "Web-grounded",
              desc: "Live search and URL fetching for updated answers.",
            },
            {
              icon: Code2,
              title: "40+ languages",
              desc: "From Python to Rust, TypeScript to GLSL.",
            },
            {
              icon: Zap,
              title: "Fast replies",
              desc: "Streaming responses with crisp minimalist UI.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-3xl border bg-muted p-5">
              <f.icon className="size-5 text-primary" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
