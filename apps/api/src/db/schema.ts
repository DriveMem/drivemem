import { pgTable, uuid, varchar, text, bigint, integer, timestamp, pgEnum, jsonb, boolean, real, serial } from 'drizzle-orm/pg-core';

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
  dailyChatLimit: integer('daily_chat_limit').notNull().default(50), // 产品 Spec: 50次/天
  lastChatResetAt: timestamp('last_chat_reset_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  insight: text('insight'),
  notificationPreferences: jsonb('notification_preferences'),
  profile: jsonb('profile').default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  onboardingStep: integer('onboarding_step').notNull().default(0),
  onboardingPath: varchar('onboarding_path', { length: 50 }),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
  webhookUrl: text('webhook_url'),
});

// --- File status enum ---
export const fileStatusEnum = pgEnum('file_status', ['uploading', 'parsing', 'indexed', 'failed']);

// --- Folders ---
export const folders = pgTable('folders', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  parentId: uuid('parent_id'),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  brief: text('brief'),
  status: text('status'),
  goal: text('goal'),
  currentStep: text('current_step'),
  lastAgent: text('last_agent'),
  taskStatus: text('task_status'), // active | blocked | completed
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
  previousVersionId: uuid('previous_version_id'),
  archivedAt: timestamp('archived_at'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
  staleScore: real('stale_score').notNull().default(0),
  isSample: boolean('is_sample').notNull().default(false),
  source: varchar('source', { length: 50 }).notNull().default('upload'),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
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
  pinnedAt: timestamp('pinned_at', { withTimezone: true }),
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

// --- Tags ---
export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  color: varchar('color', { length: 20 }).notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- File Tags (join table) ---
export const fileTags = pgTable('file_tags', {
  fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
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
  permission: text('permission').notNull().default('view'), // 'view' | 'download'
  reportId: uuid('report_id').references(() => reports.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Notifications ---
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'file_indexed' | 'summary_generated' | 'knowledge_link_found' | 'insight_updated'
  title: text('title').notNull(),
  message: text('message').notNull(),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- User Memory ---
export const userMemory = pgTable('user_memory', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value').notNull(),
  source: uuid('source'), // conversationId
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Feedback ---
export const feedback = pgTable('feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  type: text('type').default('suggestion').notNull(), // bug | suggestion | confused
  content: text('content').notNull(),
  email: text('email'),
  page: text('page'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Message Ratings ---
export const messageRatings = pgTable('message_ratings', {
  id: uuid('id').defaultRandom().primaryKey(),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: text('rating').notNull(), // 'thumbs_up' | 'thumbs_down'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- API Keys ---
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(),
  keyPrefix: text('key_prefix').notNull(),
  scopes: text('scopes').array().notNull().default(['read', 'write']),
  defaultProjectId: uuid('default_project_id'),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Webhooks ---
export const webhooks = pgTable('webhooks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  events: text('events').array().notNull(),
  secret: text('secret').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  webhookId: uuid('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  event: text('event').notNull(),
  url: text('url').notNull(),
  statusCode: integer('status_code'),
  success: boolean('success').notNull(),
  duration: integer('duration_ms'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Webhook Subscriptions (event filters) ---
export const webhookSubscriptions = pgTable('webhook_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  webhookId: uuid('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(), // 'knowledge.stored' | 'knowledge.updated' | 'insight.discovered' | 'conflict.detected' | '*'
  projectId: uuid('project_id'),
  tags: jsonb('tags'), // e.g. ["decision", "engineering"]
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- API Activity Logs ---
export const apiActivityLogs = pgTable('api_activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  agentName: varchar('agent_name', { length: 255 }),
  action: varchar('action', { length: 50 }).notNull(),
  detail: text('detail'),
  metadata: jsonb('metadata'),
  relatedFileIds: jsonb('related_file_ids'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Insights ---
export const insights = pgTable('insights', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sourceFileId: uuid('source_file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  relatedFileId: uuid('related_file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'relation' | 'contradiction' | 'trend'
  title: text('title').notNull(),
  description: text('description').notNull(),
  similarityScore: real('similarity_score'),
  metadata: jsonb('metadata'),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Knowledge Feedback ---
export const knowledgeFeedback = pgTable('knowledge_feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: text('rating').notNull(), // 'useful' | 'not_useful'
  context: text('context'), // 'search' | 'compile' | 'detail' | 'auto_capture'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Knowledge Edges (Work Graph) ---
export const knowledgeEdges = pgTable('knowledge_edges', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  targetId: uuid('target_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  relation: text('relation').notNull(), // supports | contradicts | depends_on | follows | related
  confidence: real('confidence').notNull().default(0.5),
  discoveredBy: text('discovered_by').notNull().default('auto'), // auto | user
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Compilation Logs ---
export const compilationLogs = pgTable('compilation_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  compilationId: uuid('compilation_id').notNull().unique(),
  task: text('task').notNull(),
  snippetsReturned: integer('snippets_returned'),
  totalTokens: integer('total_tokens'),
  latencyMs: integer('latency_ms'),
  coverageScore: real('coverage_score'),
  sourceFileIds: jsonb('source_file_ids'),
  depth: varchar('depth', { length: 10 }),
  role: varchar('role', { length: 50 }),
  domain: varchar('domain', { length: 50 }),
  negativeFeedback: boolean('negative_feedback').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Agent Connections ---
export const agentConnections = pgTable('agent_connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  agentName: varchar('agent_name', { length: 255 }),
  transport: varchar('transport', { length: 30 }),
  connectedAt: timestamp('connected_at', { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
  disconnectedAt: timestamp('disconnected_at', { withTimezone: true }),
  status: varchar('status', { length: 20 }).notNull().default('online'),
});

// --- Work Items (Work Graph State Engine) ---
export const workItems = pgTable('work_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  folderId: uuid('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  type: varchar('type', { length: 30 }).notNull(), // decision | todo | blocker | milestone | insight
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active | done | blocked | archived
  sourceFileId: uuid('source_file_id').references(() => files.id, { onDelete: 'set null' }),
  sourceAgent: varchar('source_agent', { length: 255 }),
  priority: varchar('priority', { length: 10 }), // high | medium | low
  dueDate: timestamp('due_date', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- Nudge State (Activation Nudge Sequence) ---
export const nudgeState = pgTable('nudge_state', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  fileUploadAt: timestamp('file_upload_at', { withTimezone: true }),
  chatFirstAt: timestamp('chat_first_at', { withTimezone: true }),
  mcpConnectAt: timestamp('mcp_connect_at', { withTimezone: true }),
  nudgeD0SentAt: timestamp('nudge_d0_sent_at', { withTimezone: true }),
  nudgeD1SentAt: timestamp('nudge_d1_sent_at', { withTimezone: true }),
  nudgeD3SentAt: timestamp('nudge_d3_sent_at', { withTimezone: true }),
  nudgeD7SentAt: timestamp('nudge_d7_sent_at', { withTimezone: true }),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  unsubscribedEmail: boolean('unsubscribed_email').notNull().default(false),
  unsubscribeToken: varchar('unsubscribe_token', { length: 64 }).notNull(),
  lastEmailSentDate: varchar('last_email_sent_date', { length: 10 }), // YYYY-MM-DD
  lastNotificationSentDate: varchar('last_notification_sent_date', { length: 10 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- Integrations (external data sources) ---
export const integrationStatusEnum = pgEnum('integration_status', ['active', 'paused', 'error', 'revoked']);

export const integrations = pgTable('integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(), // 'notion' | 'github' | 'gmail'
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  externalAccountId: varchar('external_account_id', { length: 255 }),
  externalAccountName: varchar('external_account_name', { length: 255 }),
  config: jsonb('config').default({ syncEnabled: true, lastSyncAt: null, syncedPageIds: [] }),
  status: integrationStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- Agent Profiles ---
export const agentProfiles = pgTable('agent_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  modelHint: varchar('model_hint', { length: 100 }),
  contextBudget: integer('context_budget').default(8000),
  priorityRules: jsonb('priority_rules'),
  includeTypes: jsonb('include_types'),
  excludeTypes: jsonb('exclude_types'),
  projectId: uuid('project_id'),
  notes: text('notes'),
  role: text('role'), // 'coder' | 'writer' | 'researcher' | 'strategist' | 'general'
  domain: text('domain'), // 'coding' | 'writing' | 'research' | 'strategy' | 'general'
  capabilities: jsonb('capabilities'), // { canSearch, canStore, canCompile, canAsk }
  preferences: jsonb('preferences'), // { preferredFormat, maxTokenBudget, language }
  contextRules: jsonb('context_rules'), // { projectFilter, tagFilter, excludeTags, recencyBias }
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Search Feedback (data flywheel v1) ---
export const searchFeedback = pgTable('search_feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  query: text('query').notNull(),
  fileId: uuid('file_id').references(() => files.id, { onDelete: 'cascade' }),
  signal: text('signal').notNull(), // 'click' | 'thumbs_up' | 'thumbs_down' | 'dwell' | 'copy' | 'reformulation'
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- Citation Events (data flywheel — citation tracking) ---
export const citationEvents = pgTable('citation_events', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  source: text('source').notNull(), // 'compile' | 'search' | 'ask' | 'mcp_search'
  query: text('query'),
  agentName: text('agent_name'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// --- Knowledge Gaps (data flywheel — zero-result tracking) ---
export const knowledgeGaps = pgTable('knowledge_gaps', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  query: text('query').notNull(),
  source: text('source').notNull(), // 'search' | 'mcp_search' | 'ask' | 'chat'
  resultCount: integer('result_count').notNull().default(0),
  dismissed: boolean('dismissed').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// --- Proxy Call Events (data flywheel — proxy telemetry) ---
export const proxyCallEvents = pgTable('proxy_call_events', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  modelName: text('model_name').notNull(),
  provider: text('provider').notNull(), // 'openai' | 'anthropic'
  contextTokens: integer('context_tokens'),
  totalTokens: integer('total_tokens'),
  responseTimeMs: integer('response_time_ms'),
  injectedContext: boolean('injected_context').default(false),
  success: boolean('success').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// --- Model Profile Overrides (data flywheel — proxy auto-tuning) ---
// --- Anonymous Search Signals (cross-user anonymous learning) ---
export const anonymousSearchSignals = pgTable('anonymous_search_signals', {
  id: serial('id').primaryKey(),
  queryHash: text('query_hash').notNull(),
  queryCategory: text('query_category'),
  resultCount: integer('result_count').notNull(),
  hadClick: boolean('had_click').default(false),
  hadFeedback: boolean('had_feedback').default(false),
  source: text('source').notNull(), // 'web_search' | 'mcp_search' | 'mcp_ask'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// --- Popular Query Patterns (aggregated from anonymous signals) ---
export const popularQueryPatterns = pgTable('popular_query_patterns', {
  id: serial('id').primaryKey(),
  pattern: text('pattern').notNull().unique(),
  frequency: integer('frequency').notNull(),
  avgResultCount: real('avg_result_count'),
  avgClickRate: real('avg_click_rate'),
  lastSeen: timestamp('last_seen'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

<<<<<<< HEAD
// --- Workspaces ---
export const workspaceRoleEnum = pgEnum('workspace_role', ['owner', 'admin', 'member', 'viewer']);

=======
// --- Workspace role enum ---
export const workspaceRoleEnum = pgEnum('workspace_role', ['owner', 'admin', 'member', 'viewer']);

// --- Workspaces ---
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))
export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

<<<<<<< HEAD
=======
// --- Workspace Members ---
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))
export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: workspaceRoleEnum('role').notNull().default('member'),
  invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
  joinedAt: timestamp('joined_at', { withTimezone: true }),
});

<<<<<<< HEAD
// --- Handoffs ---
export const handoffStatusEnum = pgEnum('handoff_status', ['draft', 'sent', 'received', 'request_more', 'supplementing', 'accepted', 'rejected', 'expired']);

=======
// --- Handoff status enum ---
export const handoffStatusEnum = pgEnum('handoff_status', ['draft', 'sent', 'received', 'request_more', 'supplementing', 'accepted', 'rejected', 'expired']);

// --- Handoffs ---
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))
export const handoffs = pgTable('handoffs', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  fromUserId: uuid('from_user_id').notNull().references(() => users.id),
  toUserId: uuid('to_user_id').notNull().references(() => users.id),
  status: handoffStatusEnum('status').notNull().default('draft'),
  contextPack: jsonb('context_pack').notNull().default({}),
  supplementRequests: jsonb('supplement_requests').default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const modelProfileOverrides = pgTable('model_profile_overrides', {
  id: serial('id').primaryKey(),
  modelName: text('model_name').notNull().unique(),
  optimalContextTokens: integer('optimal_context_tokens'),
  avgResponseTimeMs: integer('avg_response_time_ms'),
  successRate: real('success_rate'),
  sampleCount: integer('sample_count'),
  lastUpdated: timestamp('last_updated').notNull().defaultNow(),
});
