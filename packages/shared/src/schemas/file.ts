import { z } from 'zod';

export const FileStatusEnum = z.enum(['uploading', 'parsing', 'indexed', 'failed']);
export type FileStatus = z.infer<typeof FileStatusEnum>;

export const FileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  status: FileStatusEnum,
  errorMessage: z.string().nullable(),
  folderId: z.string().uuid().nullable(),
  chunkCount: z.number(),
  userId: z.string().uuid(),
  s3Key: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type File = z.infer<typeof FileSchema>;

export const FolderSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  parentId: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  createdAt: z.coerce.date(),
});

export type Folder = z.infer<typeof FolderSchema>;
