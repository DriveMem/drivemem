import { pgTable, uuid, varchar, text, bigint, integer, timestamp, pgEnum, jsonb, boolean } from 'drizzle-orm/pg-core';

export const authProviderEnum = pgEnum('auth_provider', ['credentials', 'google', 'github']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  passwordHash: text('password_hash'),
  avatarUrl: text('avatar_url'),
  authProvider: authProviderEnum('auth_provider').notNull().default('credentials'),
  storageUsed: bigint('storage_used', { mode: 'number' }).notNull().default(0),
  storageLimit: bigint('storage_limit', { mode: 'number' }).notNull().default(5_368_709_120), // 5 GB
  dailyChatCount: integer('daily_chat_count').notNull().default(0),
  dailyChatLimit: integer('daily_chat_limit').notNull().default(20), // 产品 Spec: 20次/天
  lastChatResetAt: timestamp('last_chat_reset_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  insight: text('insight'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- File status enum ---
export const fileStatusEnum = pgEnum('file_status', ['uploading', 'parsing', 'indexed', 'failed']);

// --- Folders ---
export const folders = pgTable('folders', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  parentId: uuid('parent_id'),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- Files ---
export const files = pgTable('files', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 127 }).notNull(),
  size: bigint('size', { mode: 'number' }).notNull(),
  status: fileStatusEnum('status').notNull().default('uploading'),
  errorMessage: text('error_message'),
  folderId: uuid('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  chunkCount: integer('chunk_count').notNull().default(0),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  s3Key: text('s3_key').notNull(),
  summary: text('summary'),
  suggestedFolder: text('suggested_folder'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- Conversation scope enum ---
export const scopeTypeEnum = pgEnum('scope_type', ['all', 'folder', 'file']);

// --- Conversations ---
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull().default('新对话'),
  scopeType: scopeTypeEnum('scope_type').notNull().default('all'),
  scopeId: uuid('scope_id'),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isPinned: boolean('is_pinned').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- Message role enum ---
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system']);

// --- Messages ---
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  citations: jsonb('citations'),
  tokenCount: integer('token_count'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- Knowledge Links ---
export const knowledgeLinks = pgTable('knowledge_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fileAId: uuid('file_a_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  fileBId: uuid('file_b_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  relationType: text('relation_type').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- Password Reset Tokens ---
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- Reports ---
export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const shares = pgTable('shares', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: text('token').notNull().unique(),
  fileId: uuid('file_id').references(() => files.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull().default('file'),
  reportId: uuid('report_id').references(() => reports.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
