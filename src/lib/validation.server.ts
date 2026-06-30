/**
 * Request validation utilities
 * Centralized validation schemas for API endpoints
 */

import { z } from "zod";

// Common schemas
export const UUIDSchema = z.string().uuid();
export const ThreadIdSchema = UUIDSchema;
export const UserIdSchema = UUIDSchema;

// Chat request
export const ChatRequestSchema = z.object({
  messages: z.array(z.any()).min(1).describe("Array of messages in conversation"),
  agentMode: z.boolean().optional().default(false),
  threadId: z.string().uuid().describe("Thread ID"),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// Thread operations
export const CreateThreadSchema = z.object({
  agentMode: z.boolean().optional().default(false),
});

export const RenameThreadSchema = z.object({
  threadId: ThreadIdSchema,
  title: z.string().min(1).max(120),
});

export const GetThreadSchema = z.object({
  threadId: ThreadIdSchema,
});

export const DeleteThreadSchema = z.object({
  threadId: ThreadIdSchema,
});

export const SetAgentModeSchema = z.object({
  threadId: ThreadIdSchema,
  agentMode: z.boolean(),
});

export const AppendMessagesSchema = z.object({
  threadId: ThreadIdSchema,
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      parts: z.array(z.any()),
    }),
  ),
});

// Validation helper
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formatted = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
      throw new Error(`Validation error: ${formatted}`);
    }
    throw error;
  }
}
