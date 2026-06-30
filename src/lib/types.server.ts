import { z } from "zod";

// Mensaje individual (inmutable, append-only)
export const MessageSchema = z.object({
  id: z.string().uuid(),
  thread_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(z.any()),
  created_at: z.string().datetime(),
});

export type Message = z.infer<typeof MessageSchema>;

// Thread metadata
export const ThreadSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().max(120),
  agent_mode: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  message_count: z.number().int().min(0),
});

export type Thread = z.infer<typeof ThreadSchema>;

// API Response types
export const ErrorResponse = z.object({
  error: z.string(),
  code: z.string(),
  details: z.record(z.any()).optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponse>;

// Tool execution context
export interface ToolContext {
  userId: string;
  threadId: string;
  agentMode: boolean;
}

// Validated request
export interface ValidatedChatRequest {
  messages: Array<any>;
  agentMode: boolean;
  threadId: string;
}
