import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · NOVA" },
      { name: "description", content: "Sign in to NOVA, the advanced AI mode." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/app" });
    });
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate inputs
      if (!email.trim()) {
        toast.error("Email is required");
        setLoading(false);
        return;
      }
      if (!password) {
        toast.error("Password is required");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters");
        setLoading(false);
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) {
          // User-friendly error messages
          if (error.message.includes("already registered")) {
            toast.error("Email is already in use. Try signing in instead.");
          } else if (error.message.includes("Password")) {
            toast.error("Password doesn't meet security requirements (min 6 characters)");
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success("Account created! Check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          // User-friendly error messages
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Email or password is incorrect");
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("Please confirm your email first. Check your inbox.");
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success("Signed in successfully!");
      }
      navigate({ to: "/app" });
    } catch (err) {
      const message = (err as Error).message || "An unexpected error occurred";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
      });

      if (res.error) {
        toast.error(res.error.message ?? "Google sign in failed");
        return;
      }

      // If redirected, the OAuth flow will handle navigation
      if (res.redirected) {
        return;
      }

      // If successful but not redirected, navigate to app
      navigate({ to: "/app" });
    } catch (err) {
      toast.error((err as Error).message ?? "Google sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="size-10 rounded-2xl bg-muted flex items-center justify-center">
            <Sparkles className="size-5 text-primary" />
          </div>
          <span className="text-2xl font-semibold tracking-tight">NOVA</span>
        </Link>
        <div className="rounded-3xl border bg-card p-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin" ? "Sign in to continue to NOVA." : "Free, no credit card."}
          </p>

          <Button
            type="button"
            variant="outline"
            className="w-full mt-6 h-11"
            onClick={handleGoogle}
          >
            <svg className="size-4 mr-2" viewBox="0 0 48 48">
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.9 6.4 29.2 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.9 6.4 29.2 4.5 24 4.5 16.3 4.5 9.7 8.7 6.3 14.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 43.5c5.1 0 9.8-1.9 13.3-5.1l-6.1-5c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.2 16.2 43.5 24 43.5z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.1 5c-.4.4 6.7-4.9 6.7-14.4 0-1.2-.1-2.3-.4-3.5z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                maxLength={128}
                placeholder="At least 6 characters"
                className="mt-1"
              />
              {password && password.length < 6 && (
                <p className="text-xs text-destructive mt-1">
                  Password must be at least 6 characters
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-primary text-primary-foreground border-0"
              disabled={loading || !email || !password || password.length < 6}
            >
              {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
            className="mt-5 w-full text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "signin"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
