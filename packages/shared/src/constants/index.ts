/** 5 GB in bytes */
export const STORAGE_LIMIT = 5_368_709_120;

/** Max daily chat messages for free tier */
export const DAILY_CHAT_LIMIT = 50;

/** 50 MB in bytes */
export const MAX_FILE_SIZE = 52_428_800;

/** Supported MIME types for file upload */
export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

/** Number of recent conversation rounds to include as context */
export const CHAT_CONTEXT_ROUNDS = 5;

/** Chunk size for document splitting (in tokens) */
export const CHUNK_SIZE = 800;

/** Overlap between chunks (in tokens) */
export const CHUNK_OVERLAP = 100;
