import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("threads")
      .select("id,title,agent_mode,updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data;
  });

export const getThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ threadId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: thread, error: tErr } = await context.supabase
      .from("threads")
      .select("id,title,agent_mode")
      .eq("id", data.threadId)
      .single();
    if (tErr) throw new Error(tErr.message);
    const { data: msgs, error: mErr } = await context.supabase
      .from("messages")
      .select("id,role,parts,created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);
    return { thread, messages: msgs };
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ agentMode: z.boolean().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("threads")
      .insert({ user_id: context.userId, agent_mode: data.agentMode ?? false })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ threadId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("threads")
      .delete()
      .eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renameThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ threadId: z.string().uuid(), title: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("threads")
      .update({ title: data.title })
      .eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setAgentMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ threadId: z.string().uuid(), agentMode: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("threads")
      .update({ agent_mode: data.agentMode })
      .eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const PartSchema = z.array(z.any());

export const saveMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        threadId: z.string().uuid(),
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant", "system"]),
            parts: PartSchema,
          }),
        ),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Replace all messages for the thread (simplest correct approach for this app size)
    const del = await context.supabase
      .from("messages")
      .delete()
      .eq("thread_id", data.threadId);
    if (del.error) throw new Error(del.error.message);
    if (data.messages.length === 0) return { ok: true };
    const rows = data.messages.map((m) => ({
      thread_id: data.threadId,
      user_id: context.userId,
      role: m.role,
      parts: m.parts,
    }));
    const { error } = await context.supabase.from("messages").insert(rows);
    if (error) throw new Error(error.message);
    // Auto-title from first user message if still default
    const firstUser = data.messages.find((m) => m.role === "user");
    if (firstUser) {
      const text = (firstUser.parts as Array<{ type?: string; text?: string }>)
        .filter((p) => p?.type === "text")
        .map((p) => p.text ?? "")
        .join(" ")
        .slice(0, 80)
        .trim();
      if (text) {
        await context.supabase
          .from("threads")
          .update({ title: text })
          .eq("id", data.threadId)
          .eq("title", "New chat");
      }
    }
    return { ok: true };
  });
