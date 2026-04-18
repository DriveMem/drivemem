import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and, desc, sql, isNull, isNotNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { fileParseQueue } from '../lib/queue.js';
import { generateUploadUrl, generatePreviewUrl, headObject, deleteObject, s3Client } from '../services/s3.service.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../lib/config.js';
import { deleteByFileId } from '../services/vector.service.js';
import { MAX_FILE_SIZE, SUPPORTED_MIME_TYPES } from '@ai-drive/shared';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PARSE_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 30_000 },
};

// --- Schemas ---

const uploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string(),
  size: z.number().int().positive(),
  folderId: z.string().uuid().nullable(),
});

const confirmSchema = z.object({
  fileId: z.string().uuid(),
});

const renameSchema = z.object({
  name: z.string().min(1).max(255),
});

const moveSchema = z.object({
  folderId: z.string().uuid().nullable(),
});

const listQuerySchema = z.object({
  folderId: z.string().uuid().optional(),
  status: z.enum(['uploading', 'parsing', 'indexed', 'failed']).optional(),
});

// --- Helper ---

async function getOwnedFile(fileId: string, userId: string) {
  const [file] = await db
    .select()
    .from(schema.files)
    .where(and(eq(schema.files.id, fileId), eq(schema.files.userId, userId)));
  if (!file) throw new AppError(ErrorCodes.NOT_FOUND, 'File not found', 404);
  return file;
}

async function resolveUniqueName(name: string, folderId: string | null, userId: string, excludeId?: string): Promise<string> {
  let candidate = name;
  let suffix = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const conditions = [
      eq(schema.files.name, candidate),
      eq(schema.files.userId, userId),
    ];
    if (folderId) {
      conditions.push(eq(schema.files.folderId, folderId));
    } else {
      conditions.push(sql`${schema.files.folderId} IS NULL`);
    }
    const [existing] = await db.select({ id: schema.files.id }).from(schema.files).where(and(...conditions));
    if (!existing || (excludeId && existing.id === excludeId)) return candidate;
    suffix++;
    const dotIdx = name.lastIndexOf('.');
    if (dotIdx > 0) {
      candidate = `${name.slice(0, dotIdx)} (${suffix})${name.slice(dotIdx)}`;
    } else {
      candidate = `${name} (${suffix})`;
    }
  }
}

// --- Plugin ---

export default async function fileRoutes(fastify: FastifyInstance) {
  // POST /upload-url
  fastify.post('/upload-url', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = uploadUrlSchema.parse(request.body);
    const userId = request.user!.id;

    // Validate mime type
    if (!(SUPPORTED_MIME_TYPES as readonly string[]).includes(body.mimeType)) {
      throw new AppError(ErrorCodes.UNSUPPORTED_FILE_TYPE, 'Unsupported file type', 400);
    }

    // Validate size
    if (body.size > MAX_FILE_SIZE) {
      throw new AppError(ErrorCodes.FILE_TOO_LARGE, 'File too large', 400);
    }

    // Check storage limit
    const [user] = await db.select({ storageUsed: schema.users.storageUsed, storageLimit: schema.users.storageLimit })
      .from(schema.users)
      .where(eq(schema.users.id, userId));
    if (!user) throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
    if (user.storageUsed + body.size > user.storageLimit) {
      throw new AppError(ErrorCodes.STORAGE_LIMIT_EXCEEDED, 'Storage limit exceeded', 413);
    }

    // Validate folderId
    if (body.folderId) {
      const [folder] = await db.select({ id: schema.folders.id })
        .from(schema.folders)
        .where(and(eq(schema.folders.id, body.folderId), eq(schema.folders.userId, userId)));
      if (!folder) throw new AppError(ErrorCodes.NOT_FOUND, 'Folder not found', 404);
    }

    // Check for existing file with same name (version detection)
    const existingFiles = await db.select({ id: schema.files.id, name: schema.files.name })
      .from(schema.files)
      .where(and(eq(schema.files.userId, userId), eq(schema.files.name, body.fileName)));

    let previousVersionId: string | null = null;
    if (existingFiles.length > 0) {
      const old = existingFiles[0];
      previousVersionId = old.id;
      const ext = old.name.lastIndexOf('.') > -1 ? old.name.substring(old.name.lastIndexOf('.')) : '';
      const baseName = old.name.lastIndexOf('.') > -1 ? old.name.substring(0, old.name.lastIndexOf('.')) : old.name;
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const newOldName = `${baseName}_${timestamp}${ext}`;
      await db.update(schema.files).set({ name: newOldName }).where(eq(schema.files.id, old.id));
    }

    // Create file record
    const s3Key = `users/${userId}/files/${crypto.randomUUID()}/${body.fileName}`;
    const uniqueName = await resolveUniqueName(body.fileName, body.folderId, userId);

    const [file] = await db.insert(schema.files).values({
      name: uniqueName,
      originalName: body.fileName,
      mimeType: body.mimeType,
      size: body.size,
      status: 'uploading',
      folderId: body.folderId,
      userId,
      s3Key,
      previousVersionId,
    }).returning();

    const uploadUrl = await generateUploadUrl(s3Key, body.mimeType);

    // Replace localhost URL with public URL for presigned access
    const publicUploadUrl = uploadUrl.replace('http://localhost:9000', 'https://api.drivemem.cloud/s3');

    return reply.send({ uploadUrl: publicUploadUrl, fileId: file.id, s3Key });
  });

  // POST /confirm
  fastify.post('/confirm', { preHandler: [requireAuth] }, async (request, reply) => {
    const { fileId } = confirmSchema.parse(request.body);
    const userId = request.user!.id;

    const file = await getOwnedFile(fileId, userId);
    if (file.status !== 'uploading') {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'File is not in uploading status', 400);
    }

    // Verify S3 object exists
    const exists = await headObject(file.s3Key);
    if (!exists) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'S3 object not found. Upload may not be complete.', 404);
    }

    // Update file status
    await db.update(schema.files)
      .set({ status: 'parsing', updatedAt: new Date() })
      .where(eq(schema.files.id, fileId));

    // Update storage used
    await db.update(schema.users)
      .set({ storageUsed: sql`${schema.users.storageUsed} + ${file.size}` })
      .where(eq(schema.users.id, userId));

    // Enqueue parse job
    await fileParseQueue.add('parse', {
      fileId,
      userId,
      s3Key: file.s3Key,
      mimeType: file.mimeType,
    }, PARSE_JOB_OPTIONS);

    return reply.send({ fileId, status: 'parsing' });
  });

  // GET /conflicts — knowledge conflicts for current user
  fastify.get('/conflicts', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { getConflicts } = await import('../services/knowledge-graph.js');
    const conflicts = await getConflicts(userId);
    return reply.send({ conflicts, count: conflicts.length });
  });

  // GET /stale — stale content for dashboard
  fastify.get('/stale', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { detectStaleContent } = await import('../services/stale-detector.js');
    const staleFiles = await detectStaleContent(userId);
    return reply.send({ staleFiles, count: staleFiles.length });
  });

  // POST /stale/:fileId/dismiss — dismiss stale warning
  fastify.post('/stale/:fileId/dismiss', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { fileId } = request.params as { fileId: string };
    const [file] = await db.select({ id: schema.files.id })
      .from(schema.files)
      .where(and(eq(schema.files.id, fileId), eq(schema.files.userId, userId)));
    if (!file) return reply.status(404).send({ error: 'File not found' });
    await db.update(schema.files)
      .set({ staleScore: 0, lastAccessedAt: new Date() })
      .where(eq(schema.files.id, fileId));
    return reply.send({ success: true });
  });

  // GET / — file list
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const query = listQuerySchema.parse(request.query);

    const conditions = [eq(schema.files.userId, userId), isNull(schema.files.deletedAt)];
    if (query.folderId) {
      conditions.push(eq(schema.files.folderId, query.folderId));
    }
    if (query.status) {
      conditions.push(eq(schema.files.status, query.status));
    }

    const fileList = await db.select()
      .from(schema.files)
      .where(and(...conditions))
      .orderBy(desc(schema.files.updatedAt));

    // Enrich with tags
    const filesWithTags = await Promise.all(fileList.map(async (f) => {
      const fileTags = await db.select({ name: schema.tags.name, color: schema.tags.color })
        .from(schema.fileTags)
        .innerJoin(schema.tags, eq(schema.fileTags.tagId, schema.tags.id))
        .where(eq(schema.fileTags.fileId, f.id));
      return { ...f, tags: fileTags };
    }));

    return reply.send(filesWithTags);
  });

  // GET /:id — file detail
  fastify.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_REGEX.test(id)) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'File not found' } });
    }
    const file = await getOwnedFile(id, request.user!.id);
    // Update lastAccessedAt for recent files sorting
    await db.update(schema.files).set({ updatedAt: new Date() }).where(eq(schema.files.id, id));
    return reply.send(file);
  });

  // GET /:id/relationships — get knowledge graph edges for a file
  fastify.get('/:id/relationships', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_REGEX.test(id)) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'File not found' } });
    }
    const { getFileRelationships } = await import('../services/knowledge-graph.js');
    const relationships = await getFileRelationships(id);
    return reply.send({ relationships });
  });

  // PATCH /:id — rename
  fastify.patch('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_REGEX.test(id)) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'File not found' } });
    }
    const { name } = renameSchema.parse(request.body);
    const userId = request.user!.id;

    const file = await getOwnedFile(id, userId);
    const uniqueName = await resolveUniqueName(name, file.folderId, userId, id);

    const [updated] = await db.update(schema.files)
      .set({ name: uniqueName, updatedAt: new Date() })
      .where(eq(schema.files.id, id))
      .returning();

    return reply.send(updated);
  });

  // DELETE /:id — soft delete (move to trash)
  fastify.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_REGEX.test(id)) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'File not found' } });
    }
    const userId = request.user!.id;
    await getOwnedFile(id, userId);

    // Soft delete — set deletedAt timestamp
    await db.update(schema.files)
      .set({ deletedAt: new Date() })
      .where(eq(schema.files.id, id));

    return reply.send({ success: true });
  });

  // POST /:id/move — move file to another folder
  fastify.post('/:id/move', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_REGEX.test(id)) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'File not found' } });
    }
    const { folderId } = moveSchema.parse(request.body);
    const userId = request.user!.id;

    await getOwnedFile(id, userId);

    // Validate target folder
    if (folderId) {
      const [folder] = await db.select({ id: schema.folders.id })
        .from(schema.folders)
        .where(and(eq(schema.folders.id, folderId), eq(schema.folders.userId, userId)));
      if (!folder) throw new AppError(ErrorCodes.NOT_FOUND, 'Target folder not found', 404);
    }

    const [updated] = await db.update(schema.files)
      .set({ folderId, updatedAt: new Date() })
      .where(eq(schema.files.id, id))
      .returning();

    return reply.send(updated);
  });

  // GET /:id/preview-url
  fastify.get('/:id/preview-url', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_REGEX.test(id)) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'File not found' } });
    }
    const file = await getOwnedFile(id, request.user!.id);
    // Update lastAccessedAt (updatedAt) for recent files sorting
    await db.update(schema.files).set({ updatedAt: new Date() }).where(eq(schema.files.id, id));
    if (!file.s3Key) {
      // Store-created notes have no S3 file — return summary as downloadable content
      return reply.send({ content: file.summary || 'No content available', mimeType: 'text/markdown', isNote: true });
    }
    const previewUrl = await generatePreviewUrl(file.s3Key);
    const publicPreviewUrl = previewUrl.replace('http://localhost:9000', 'https://api.drivemem.cloud/s3');
    return reply.send({ previewUrl: publicPreviewUrl, mimeType: file.mimeType });
  });

  // POST /:id/retry-parse
  fastify.post('/:id/retry-parse', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_REGEX.test(id)) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'File not found' } });
    }
    const userId = request.user!.id;

    const file = await getOwnedFile(id, userId);
    if (file.status !== 'failed') {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Only failed files can be retried', 400);
    }

    await deleteByFileId(id);

    await db.update(schema.files).set({
      status: 'parsing',
      errorMessage: null,
      chunkCount: 0,
      updatedAt: new Date(),
    }).where(eq(schema.files.id, id));

    await fileParseQueue.add('parse', {
      fileId: id,
      userId,
      s3Key: file.s3Key,
      mimeType: file.mimeType,
    }, PARSE_JOB_OPTIONS);

    return reply.send({ fileId: id, status: 'parsing' });
  });

  // POST /upload — direct file upload (proxy to MinIO, no presigned URL needed)
  fastify.post('/upload', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const data = await request.file();
    if (!data) throw new AppError(ErrorCodes.VALIDATION_ERROR, 'No file provided', 400);

    const fileName = data.filename;
    const mimeType = data.mimetype;
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk as Buffer);
    const buffer = Buffer.concat(chunks);
    const size = buffer.length;

    // Validate
    if (size > MAX_FILE_SIZE) throw new AppError(ErrorCodes.FILE_TOO_LARGE, 'File exceeds 50MB limit', 413);
    if (!(SUPPORTED_MIME_TYPES as readonly string[]).includes(mimeType)) {
      throw new AppError(ErrorCodes.UNSUPPORTED_FILE_TYPE, 'Unsupported file type', 400);
    }

    const [user] = await db.select({ storageUsed: schema.users.storageUsed, storageLimit: schema.users.storageLimit })
      .from(schema.users).where(eq(schema.users.id, userId));
    if (user.storageUsed + size > user.storageLimit) {
      throw new AppError(ErrorCodes.STORAGE_LIMIT_EXCEEDED, 'Storage limit exceeded', 413);
    }

    // Parse folderId from fields
    const folderId = (data.fields?.folderId as any)?.value || null;
    const fileId = crypto.randomUUID();
    const s3Key = `users/${userId}/files/${fileId}/${fileName}`;

    // Upload to MinIO directly
    await s3Client.send(new PutObjectCommand({
      Bucket: config.AWS_S3_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
    }));

    // Check for existing file with same name (version detection)
    const existingUploadFiles = await db.select({ id: schema.files.id, name: schema.files.name })
      .from(schema.files)
      .where(and(eq(schema.files.userId, userId), eq(schema.files.name, fileName)));

    let previousVersionId: string | null = null;
    if (existingUploadFiles.length > 0) {
      const old = existingUploadFiles[0];
      previousVersionId = old.id;
      const ext = old.name.lastIndexOf('.') > -1 ? old.name.substring(old.name.lastIndexOf('.')) : '';
      const baseName = old.name.lastIndexOf('.') > -1 ? old.name.substring(0, old.name.lastIndexOf('.')) : old.name;
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const newOldName = `${baseName}_${timestamp}${ext}`;
      await db.update(schema.files).set({ name: newOldName }).where(eq(schema.files.id, old.id));
    }

    // Create file record
    const [file] = await db.insert(schema.files).values({
      id: fileId,
      name: fileName,
      originalName: fileName,
      mimeType,
      size,
      status: 'parsing',
      folderId: folderId && folderId !== '' ? folderId : null,
      userId,
      s3Key,
      previousVersionId,
    }).returning();

    // Update storage
    await db.update(schema.users).set({ storageUsed: sql`${schema.users.storageUsed} + ${size}` }).where(eq(schema.users.id, userId));

    // Enqueue parse job
    await fileParseQueue.add('parse', { fileId, userId, s3Key, mimeType });

    return reply.status(201).send({ fileId: file.id, status: 'parsing' });
  });

  // GET /:id/versions — file version history
  fastify.get('/:id/versions', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_REGEX.test(id)) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'File not found' } });
    }
    const userId = request.user!.id;
    const file = await getOwnedFile(id, userId);

    // Strategy 1: follow previousVersionId chain
    const versions: typeof file[] = [];
    const visited = new Set<string>();

    // Walk backward via previousVersionId
    let current = file;
    while (current.previousVersionId && !visited.has(current.previousVersionId)) {
      visited.add(current.previousVersionId);
      const [prev] = await db.select().from(schema.files)
        .where(and(eq(schema.files.id, current.previousVersionId), eq(schema.files.userId, userId)));
      if (!prev) break;
      versions.push(prev);
      current = prev;
    }

    // Strategy 2: if no versions found via chain, fallback to name prefix matching
    if (versions.length === 0) {
      const baseName = file.originalName || file.name;
      const dotIdx = baseName.lastIndexOf('.');
      const nameWithoutExt = dotIdx > 0 ? baseName.slice(0, dotIdx) : baseName;

      const similar = await db.select().from(schema.files)
        .where(and(
          eq(schema.files.userId, userId),
          sql`${schema.files.name} LIKE ${nameWithoutExt + '%'}`,
          sql`${schema.files.id} != ${id}`,
        ))
        .orderBy(desc(schema.files.createdAt));

      versions.push(...similar);
    }

    return reply.send({ versions: versions.map((v, i) => ({
      id: v.id,
      name: v.name,
      size: v.size,
      createdAt: v.createdAt,
      version: versions.length - i,
      mimeType: v.mimeType,
    })) });
  });

  // POST /auto-organize — 一键 AI 整理文件到文件夹
  fastify.post('/auto-organize', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    // Get all root-level files (no folder)
    const rootFiles = await db.select({
      id: schema.files.id,
      name: schema.files.name,
      suggestedFolder: schema.files.suggestedFolder,
      summary: schema.files.summary,
    })
      .from(schema.files)
      .where(and(eq(schema.files.userId, userId), sql`${schema.files.folderId} IS NULL`, eq(schema.files.status, 'indexed')));

    if (rootFiles.length === 0) {
      return reply.send({ organized: [], created: [], message: '没有需要整理的文件' });
    }

    // For files without suggestedFolder, generate one
    const { chat } = await import('../services/llm.service.js');
    const userFolders = await db.select({ id: schema.folders.id, name: schema.folders.name })
      .from(schema.folders)
      .where(eq(schema.folders.userId, userId));
    const existingNames = userFolders.map(f => f.name);

    for (const f of rootFiles) {
      if (!f.suggestedFolder && f.summary) {
        const folderNames = existingNames.length > 0 ? existingNames.join('、') : '工作文档、学习资料、个人文件';
        const prompt = `文件：${f.name}\n摘要：${f.summary.substring(0, 100)}\n\n现有文件夹：${folderNames}\n\n这个文件最适合放入哪个文件夹？规则：只输出文件夹名称本身，禁止输出解释。如果现有文件夹都不合适，建议一个新的2-4字文件夹名。`;
        try {
          const suggested = await chat([{ role: 'user', content: prompt }]);
          const trimmed = suggested?.trim().replace(/["""]/g, '').split('（')[0]?.trim();
          if (trimmed && trimmed !== '无') {
            f.suggestedFolder = trimmed;
            await db.update(schema.files).set({ suggestedFolder: trimmed }).where(eq(schema.files.id, f.id));
          }
        } catch { /* skip */ }
      }
    }

    // Group by suggestedFolder
    const groups: Record<string, typeof rootFiles> = {};
    for (const f of rootFiles) {
      const folder = f.suggestedFolder || '未分类';
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(f);
    }

    const organized: Array<{ folderName: string; fileCount: number }> = [];
    const created: string[] = [];

    for (const [folderName, files] of Object.entries(groups)) {
      if (folderName === '未分类') continue;

      // Find or create folder
      let folder = userFolders.find(f => f.name === folderName);
      if (!folder) {
        const [newFolder] = await db.insert(schema.folders).values({ name: folderName, userId }).returning();
        folder = newFolder;
        created.push(folderName);
        existingNames.push(folderName);
      }

      // Move files
      for (const f of files) {
        await db.update(schema.files).set({ folderId: folder.id }).where(eq(schema.files.id, f.id));
      }

      organized.push({ folderName, fileCount: files.length });
    }

    return reply.send({ organized, created, message: `AI 整理了 ${organized.reduce((s, o) => s + o.fileCount, 0)} 个文件到 ${organized.length} 个文件夹` });
  });

  // PATCH /:id/archive — 归档文件
  fastify.patch('/:id/archive', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    const [file] = await db.select().from(schema.files).where(and(eq(schema.files.id, id), eq(schema.files.userId, userId)));
    if (!file) return reply.status(404).send({ error: 'File not found' });
    await db.update(schema.files).set({ archivedAt: new Date() }).where(eq(schema.files.id, id));
    return reply.send({ message: '文件已归档' });
  });

  // PATCH /:id/unarchive — 取消归档
  fastify.patch('/:id/unarchive', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    const [file] = await db.select().from(schema.files).where(and(eq(schema.files.id, id), eq(schema.files.userId, userId)));
    if (!file) return reply.status(404).send({ error: 'File not found' });
    await db.update(schema.files).set({ archivedAt: null }).where(eq(schema.files.id, id));
    return reply.send({ message: '文件已取消归档' });
  });

  // POST /batch — session-auth batch operations (delete/archive/unarchive)
  fastify.post('/batch', async (request, reply) => {
    const userId = request.user!.id;
    const body = request.body as { action: string; fileIds: string[] };
    if (!body?.action || !body?.fileIds?.length) return reply.status(400).send({ error: 'action and fileIds required' });

    const { eq, and, inArray } = await import('drizzle-orm');
    if (body.action === 'delete') {
      await db.delete(schema.files).where(and(eq(schema.files.userId, userId), inArray(schema.files.id, body.fileIds)));
    } else if (body.action === 'archive') {
      await db.update(schema.files).set({ archivedAt: new Date() }).where(and(eq(schema.files.userId, userId), inArray(schema.files.id, body.fileIds)));
    } else if (body.action === 'unarchive') {
      await db.update(schema.files).set({ archivedAt: null }).where(and(eq(schema.files.userId, userId), inArray(schema.files.id, body.fileIds)));
    }
    return reply.send({ success: true });
  });

  // POST /files/:id/feedback — rate a knowledge item
  fastify.post('/:id/feedback', async (request, reply) => {
    const userId = request.user!.id;
    const fileId = (request.params as any).id;
    const body = request.body as { rating: string; context?: string };

    if (!body?.rating || !['useful', 'not_useful'].includes(body.rating)) {
      return reply.status(400).send({ error: 'rating must be "useful" or "not_useful"' });
    }

    // Upsert — one rating per user per file
    await db.delete(schema.knowledgeFeedback)
      .where(and(eq(schema.knowledgeFeedback.fileId, fileId), eq(schema.knowledgeFeedback.userId, userId)));

    await db.insert(schema.knowledgeFeedback).values({
      fileId,
      userId,
      rating: body.rating,
      context: body.context || null,
    });

    return reply.send({ success: true, rating: body.rating });
  });

  // GET /files/:id/feedback — get current rating
  fastify.get('/:id/feedback', async (request, reply) => {
    const userId = request.user!.id;
    const fileId = (request.params as any).id;

    const [feedback] = await db.select()
      .from(schema.knowledgeFeedback)
      .where(and(eq(schema.knowledgeFeedback.fileId, fileId), eq(schema.knowledgeFeedback.userId, userId)));

    return reply.send({ rating: feedback?.rating || null });
  });

  // POST /store — session-auth knowledge store
  fastify.post('/store', async (request, reply) => {
    const userId = request.user!.id;
    const body = request.body as { content: string; title?: string; tags?: string };
    if (!body?.content) return reply.status(400).send({ error: 'content is required' });

    const title = body.title || body.content.slice(0, 30).replace(/\n/g, ' ');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const slug = title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'note';
    const filename = `${slug}-${timestamp.slice(0, 10)}.md`;
    const mdContent = `# ${title}\n\n${body.content}`;

    const { randomUUID } = await import('crypto');
    const fileId = randomUUID();
    const s3Key = `users/${userId}/files/${fileId}/${filename}`;
    const buffer = Buffer.from(mdContent, 'utf-8');

    const { uploadObject } = await import('../services/s3.service.js');
    await uploadObject(s3Key, buffer, 'text/markdown');

    await db.insert(schema.files).values({
      id: fileId, name: filename, originalName: filename,
      mimeType: 'text/markdown', size: buffer.length,
      status: 'parsing', userId, s3Key,
    });

    const { Queue } = await import('bullmq');
    const queue = new Queue('file-parse', { connection: { host: 'localhost', port: 6379 } });
    await queue.add('parse', { fileId, userId, s3Key, mimeType: 'text/markdown' });
    await queue.close();

    // Async relationship discovery (non-blocking)
    import('../services/knowledge-graph.js').then(({ discoverRelationships }) => {
      discoverRelationships(userId, fileId, body.content).catch(console.error);
    }).catch(() => {});

    return reply.status(201).send({ fileId, title });
  });

  // --- Agent Profiles CRUD ---

  fastify.get('/agent-profiles', async (request, reply) => {
    const userId = request.user!.id;
    const profiles = await db.select().from(schema.agentProfiles)
      .where(eq(schema.agentProfiles.userId, userId))
      .orderBy(desc(schema.agentProfiles.createdAt));
    return reply.send({ profiles });
  });

  fastify.post('/agent-profiles', async (request, reply) => {
    const userId = request.user!.id;
    const body = request.body as any;
    if (!body?.name) return reply.status(400).send({ error: 'name is required' });

    const [profile] = await db.insert(schema.agentProfiles).values({
      userId,
      name: body.name,
      modelHint: body.modelHint || null,
      contextBudget: body.contextBudget || 8000,
      priorityRules: body.priorityRules || null,
      includeTypes: body.includeTypes || null,
      excludeTypes: body.excludeTypes || null,
      projectId: body.projectId || null,
      notes: body.notes || null,
      role: body.role || null,
      domain: body.domain || null,
      capabilities: body.capabilities || null,
      preferences: body.preferences || null,
      contextRules: body.contextRules || null,
      description: body.description || null,
      apiKeyId: body.apiKeyId || null,
      isActive: body.isActive !== undefined ? body.isActive : true,
    }).returning();

    return reply.status(201).send({ profile });
  });

  fastify.patch('/agent-profiles/:id', async (request, reply) => {
    const userId = request.user!.id;
    const id = (request.params as any).id;
    const body = request.body as any;

    await db.update(schema.agentProfiles)
      .set({
        ...(body.name && { name: body.name }),
        ...(body.modelHint !== undefined && { modelHint: body.modelHint }),
        ...(body.contextBudget !== undefined && { contextBudget: body.contextBudget }),
        ...(body.priorityRules !== undefined && { priorityRules: body.priorityRules }),
        ...(body.includeTypes !== undefined && { includeTypes: body.includeTypes }),
        ...(body.excludeTypes !== undefined && { excludeTypes: body.excludeTypes }),
        ...(body.projectId !== undefined && { projectId: body.projectId }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.role !== undefined && { role: body.role }),
        ...(body.domain !== undefined && { domain: body.domain }),
        ...(body.capabilities !== undefined && { capabilities: body.capabilities }),
        ...(body.preferences !== undefined && { preferences: body.preferences }),
        ...(body.contextRules !== undefined && { contextRules: body.contextRules }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.apiKeyId !== undefined && { apiKeyId: body.apiKeyId }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.agentProfiles.id, id), eq(schema.agentProfiles.userId, userId)));

    return reply.send({ success: true });
  });

  fastify.delete('/agent-profiles/:id', async (request, reply) => {
    const userId = request.user!.id;
    const id = (request.params as any).id;
    await db.delete(schema.agentProfiles)
      .where(and(eq(schema.agentProfiles.id, id), eq(schema.agentProfiles.userId, userId)));
    return reply.send({ success: true });
  });
}
