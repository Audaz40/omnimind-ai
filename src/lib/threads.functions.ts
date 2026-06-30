import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { Errors, logInfo, logError } from "@/lib/errors.server";

// Enhanced list threads with caching
export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { data, error } = await context.supabase
        .from("threads")
        .select("id,title,agent_mode,updated_at,message_count")
        .order("updated_at", { ascending: false })
        .limit(200);

      if (error) throw Errors.internal(error.message);

      logInfo("Threads listed", { userId: context.userId, count: data?.length });
      return data || [];
    } catch (e) {
      logError(e, { operation: "listThreads" });
      throw e;
    }
  });

export const getThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ threadId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { data: thread, error: tErr } = await context.supabase
        .from("threads")
        .select("id,title,agent_mode,created_at,message_count")
        .eq("id", data.threadId)
        .eq("user_id", context.userId) // Ensure user owns this thread
        .single();

      if (tErr || !thread) throw Errors.notFound("Thread");

      // Fetch messages with pagination support (limit to recent 100 for performance)
      const {
        data: msgs,
        error: mErr,
        count,
      } = await context.supabase
        .from("messages")
        .select("id,role,parts,created_at", { count: "exact" })
        .eq("thread_id", data.threadId)
        .eq("user_id", context.userId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (mErr) throw Errors.internal(mErr.message);

      logInfo("Thread fetched", {
        userId: context.userId,
        threadId: data.threadId,
        messageCount: count,
      });
      return { thread, messages: msgs || [] };
    } catch (e) {
      logError(e, { operation: "getThread", threadId: data.threadId });
      throw e;
    }
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ agentMode: z.boolean().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    try {
      const { data: row, error } = await context.supabase
        .from("threads")
        .insert({
          user_id: context.userId,
          agent_mode: data.agentMode ?? false,
          title: "New chat",
          message_count: 0,
        })
        .select("id")
        .single();

      if (error) throw Errors.internal(error.message);

      logInfo("Thread created", {
        userId: context.userId,
        threadId: row?.id,
        agentMode: data.agentMode,
      });

      return { id: row.id as string };
    } catch (e) {
      logError(e, { operation: "createThread" });
      throw e;
    }
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ threadId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    try {
      // Verify ownership before deleting
      const { data: thread, error: verifyErr } = await context.supabase
        .from("threads")
        .select("user_id")
        .eq("id", data.threadId)
        .single();

      if (verifyErr || thread?.user_id !== context.userId) {
        throw Errors.auth("Thread not found or access denied");
      }

      const { error } = await context.supabase
        .from("threads")
        .delete()
        .eq("id", data.threadId)
        .eq("user_id", context.userId);

      if (error) throw Errors.internal(error.message);

      logInfo("Thread deleted", {
        userId: context.userId,
        threadId: data.threadId,
      });

      return { ok: true };
    } catch (e) {
      logError(e, { operation: "deleteThread", threadId: data.threadId });
      throw e;
    }
  });

export const renameThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ threadId: z.string().uuid(), title: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    try {
      const { error } = await context.supabase
        .from("threads")
        .update({ title: data.title, updated_at: new Date().toISOString() })
        .eq("id", data.threadId)
        .eq("user_id", context.userId);

      if (error) throw Errors.internal(error.message);

      logInfo("Thread renamed", {
        userId: context.userId,
        threadId: data.threadId,
        newTitle: data.title,
      });

      return { ok: true };
    } catch (e) {
      logError(e, { operation: "renameThread", threadId: data.threadId });
      throw e;
    }
  });

export const setAgentMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ threadId: z.string().uuid(), agentMode: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    try {
      const { error } = await context.supabase
        .from("threads")
        .update({ agent_mode: data.agentMode, updated_at: new Date().toISOString() })
        .eq("id", data.threadId)
        .eq("user_id", context.userId);

      if (error) throw Errors.internal(error.message);

      logInfo("Agent mode updated", {
        userId: context.userId,
        threadId: data.threadId,
        agentMode: data.agentMode,
      });

      return { ok: true };
    } catch (e) {
      logError(e, { operation: "setAgentMode", threadId: data.threadId });
      throw e;
    }
  });

const PartSchema = z.array(z.any());

/**
 * Append new messages to thread (append-only pattern)
 * More efficient than replacing all messages each time
 */
export const appendMessages = createServerFn({ method: "POST" })
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
    try {
      if (data.messages.length === 0) return { ok: true };

      // Verify thread ownership
      const { data: thread, error: threadErr } = await context.supabase
        .from("threads")
        .select("id,user_id")
        .eq("id", data.threadId)
        .single();

      if (threadErr || thread?.user_id !== context.userId) {
        throw Errors.auth("Thread not found or access denied");
      }

      // Append messages (append-only pattern)
      const rows = data.messages.map((m) => ({
        thread_id: data.threadId,
        user_id: context.userId,
        role: m.role,
        parts: m.parts,
        created_at: new Date().toISOString(),
      }));

      const { error, data: inserted } = await context.supabase
        .from("messages")
        .insert(rows)
        .select("id");

      if (error) throw Errors.internal(error.message);

      // Update thread with new message count and last update time
      const messageCount = inserted?.length || 0;
      const { error: updateErr } = await context.supabase
        .from("threads")
        .update({
          updated_at: new Date().toISOString(),
          message_count: context.supabase.rpc("increment_message_count", {
            thread_id: data.threadId,
          }),
        })
        .eq("id", data.threadId);

      if (updateErr) throw Errors.internal(updateErr.message);

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
            .update({ title: text, updated_at: new Date().toISOString() })
            .eq("id", data.threadId)
            .eq("title", "New chat");
        }
      }

      logInfo("Messages appended", {
        userId: context.userId,
        threadId: data.threadId,
        count: messageCount,
      });

      return { ok: true, created: messageCount };
    } catch (e) {
      logError(e, { operation: "appendMessages", threadId: data.threadId });
      throw e;
    }
  });

/**
 * Legacy: Replace all messages (kept for backward compatibility)
 */
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
    try {
      // Verify thread ownership
      const { data: thread, error: threadErr } = await context.supabase
        .from("threads")
        .select("id,user_id")
        .eq("id", data.threadId)
        .single();

      if (threadErr || thread?.user_id !== context.userId) {
        throw Errors.auth("Thread not found or access denied");
      }

      // Replace all messages for the thread
      const del = await context.supabase
        .from("messages")
        .delete()
        .eq("thread_id", data.threadId)
        .eq("user_id", context.userId);

      if (del.error) throw Errors.internal(del.error.message);

      if (data.messages.length === 0) return { ok: true };

      const rows = data.messages.map((m) => ({
        thread_id: data.threadId,
        user_id: context.userId,
        role: m.role,
        parts: m.parts,
        created_at: new Date().toISOString(),
      }));

      const { error } = await context.supabase.from("messages").insert(rows);

      if (error) throw Errors.internal(error.message);

      // Update thread message count
      await context.supabase
        .from("threads")
        .update({
          updated_at: new Date().toISOString(),
          message_count: data.messages.length,
        })
        .eq("id", data.threadId);

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
            .update({ title: text, updated_at: new Date().toISOString() })
            .eq("id", data.threadId)
            .eq("title", "New chat");
        }
      }

      logInfo("Messages saved", {
        userId: context.userId,
        threadId: data.threadId,
        count: data.messages.length,
      });

      return { ok: true };
    } catch (e) {
      logError(e, { operation: "saveMessages", threadId: data.threadId });
      throw e;
    }
  });
