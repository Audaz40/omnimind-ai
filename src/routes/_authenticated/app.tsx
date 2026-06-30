import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Sidebar } from "@/components/chat/Sidebar";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShell,
});

function AppShell() {
  return (
    <div className="dark h-screen flex bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
