import { z } from 'zod';

export const ScopeTypeEnum = z.enum(['all', 'folder', 'file']);
export type ScopeType = z.infer<typeof ScopeTypeEnum>;

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  scopeType: ScopeTypeEnum,
  scopeId: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

export const MessageRoleEnum = z.enum(['user', 'assistant', 'system']);
export type MessageRole = z.infer<typeof MessageRoleEnum>;

export const CitationSchema = z.object({
  fileId: z.string().uuid(),
  fileName: z.string(),
  chunkIndex: z.number(),
  text: z.string(),
  deleted: z.boolean().optional(),
});

export type Citation = z.infer<typeof CitationSchema>;

export const MessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: MessageRoleEnum,
  content: z.string(),
  citations: z.array(CitationSchema).nullable(),
  tokenCount: z.number().nullable(),
  createdAt: z.coerce.date(),
});

export type Message = z.infer<typeof MessageSchema>;
