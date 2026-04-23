// Schemas
export { UserSchema, type User } from './schemas/user.js';
export {
  FileSchema,
  FileStatusEnum,
  FolderSchema,
  type File,
  type FileStatus,
  type Folder,
} from './schemas/file.js';
export {
  ConversationSchema,
  MessageSchema,
  CitationSchema,
  ScopeTypeEnum,
  MessageRoleEnum,
  type Conversation,
  type Message,
  type Citation,
  type ScopeType,
  type MessageRole,
} from './schemas/conversation.js';
export {
  PaginationSchema,
  ErrorResponseSchema,
  SuccessResponseSchema,
  type Pagination,
  type ErrorResponse,
  type SuccessResponse,
} from './schemas/common.js';

// Proxy core
export {
  extractUserQuery,
  formatContextSnippet,
  injectContext,
  collectStreamedText,
  forwardChatCompletion,
} from './proxy/index.js';
export type {
  ChatMessage,
  ChatCompletionRequest,
  ContextSearchResult,
  ProxyAdapter,
  ForwardOptions,
} from './proxy/types.js';

// Constants
export {
  STORAGE_LIMIT,
  DAILY_CHAT_LIMIT,
  MAX_FILE_SIZE,
  SUPPORTED_MIME_TYPES,
  CHAT_CONTEXT_ROUNDS,
  CHUNK_SIZE,
  CHUNK_OVERLAP,
} from './constants/index.js';
