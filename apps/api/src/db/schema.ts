import { pgTable, uuid, varchar, text, bigint, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';

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
  dailyChatLimit: integer('daily_chat_limit').notNull().default(50),
  lastChatResetAt: timestamp('last_chat_reset_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
