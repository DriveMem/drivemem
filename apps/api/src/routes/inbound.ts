import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireApiKey, requireScope } from '../plugins/api-key-auth.js';
import { logActivity } from '../services/activity-logger.js';
import crypto from 'crypto';
import { Queue } from 'bullmq';

/**
 * Inbound routes — external systems push knowledge into DriveMem
 * POST /webhook  — single item ingest
 * POST /batch    — batch ingest (up to 50)
 * POST /email    — email forward ingest
 * GET  /recent   — recent inbound items
 */
export default async function inboundRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireApiKey);

  // --- Shared helper: store one inbound item ---
  async function storeInboundItem(
    userId: string,
    apiKeyId: string | undefined,
    apiKeyName: string | undefined,
    item: { content: string; title?: string; source?: string; tags?: string; projectId?: string; metadata?: Record<string, unknown> },
  ): Promise<{ fileId: string; title: string }> {
    const { content, source, metadata } = item;

    // Generate title if missing
    let title = item.title || '';
    if (!title) {
      try {
        const { chat } = await import('../services/llm.service.js');
        const generated = await chat([
          { role: 'system', content: 'Generate a short, descriptive title (max 8 words, English) for this note. Return ONLY the title, no quotes.' },
          { role: 'user', content: content.slice(0, 500) },
        ]);
        title = generated.trim().replace(/^["']|["']$/g, '').slice(0, 80) || content.slice(0, 30).replace(/\n/g, ' ');
      } catch {
        title = content.slice(0, 30).replace(/\n/g, ' ');
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const slug = title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'note';
    const filename = `${slug}-${timestamp.slice(0, 10)}.md`;

    const sourceLabel = source || 'webhook';
    const mdContent = `# ${title}\n\n${content}\n\n---\n_Source: ${sourceLabel} | Ingested: ${new Date().toLocaleString('zh-CN')}_`;

    // Auto-detect project
    const { detectProject } = await import('../services/project-detector.js');
    const detection = await detectProject(userId, {
      explicitProjectId: item.projectId,
      apiKeyId,
      content,
    });

    const fileId = crypto.randomUUID();
    const s3Key = `users/${userId}/files/${fileId}/${filename}`;
    const buffer = Buffer.from(mdContent, 'utf-8');

    const { uploadObject } = await import('../services/s3.service.js');
    await uploadObject(s3Key, buffer, 'text/markdown');

    await db.insert(schema.files).values({
      id: fileId,
      name: title,
      originalName: filename,
      mimeType: 'text/markdown',
      size: buffer.length,
      status: 'parsing',
      userId,
      s3Key,
      folderId: detection.projectId,
    });

    // Enqueue parse job
    const queue = new Queue('file-parse', { connection: { host: 'localhost', port: 6379 } });
    await queue.add('parse', { fileId, userId, s3Key, mimeType: 'text/markdown' });
    await queue.close();

    // Build tags: user tags + inbound-{source}
    const allTags: string[] = [];
    if (item.tags) {
      allTags.push(...item.tags.split(',').map(t => t.trim()).filter(Boolean));
    }
    allTags.push(`inbound-${sourceLabel}`);

    // Apply tags
    const tagColors: Record<string, string> = {
      decision: '#F59E0B', meeting: '#8B5CF6', note: '#A855F7',
      research: '#EC4899', report: '#10B981', spec: '#3B82F6',
    };
    for (const tagName of [...new Set(allTags)].slice(0, 10)) {
      try {
        let [existingTag] = await db.select().from(schema.tags)
          .where(and(eq(schema.tags.userId, userId), eq(schema.tags.name, tagName)));
        if (!existingTag) {
          [existingTag] = await db.insert(schema.tags).values({
            name: tagName, color: tagColors[tagName] || '#6B7280', userId,
          }).returning();
        }
        if (existingTag) {
          await db.insert(schema.fileTags).values({ fileId, tagId: existingTag.id }).catch(() => {});
        }
      } catch { /* skip */ }
    }

    // Log activity
    logActivity({
      userId,
      apiKeyId,
      agentName: apiKeyName,
      action: 'inbound',
      detail: title,
      metadata: { source: sourceLabel, method: 'webhook', ...(metadata || {}) },
      relatedFileIds: [fileId],
    });

    // Async: work item extraction + relationship discovery
    import('../services/knowledge-graph.js').then(({ discoverRelationships }) => {
      discoverRelationships(userId, fileId, content).catch(() => {});
    }).catch(() => {});

    return { fileId, title };
  }

  // POST /webhook — single item ingest
  fastify.post('/webhook', { preHandler: [requireScope('write')] }, async (request, reply) => {
    const userId = request.user!.id;
    const body = request.body as {
      content: string;
      title?: string;
      source?: string;
      tags?: string;
      projectId?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body?.content || typeof body.content !== 'string' || body.content.trim() === '') {
      return reply.status(400).send({ error: 'content is required and must be a non-empty string' });
    }

    const result = await storeInboundItem(
      userId,
      (request as any).apiKeyId,
      (request as any).apiKeyName,
      body,
    );

    return reply.status(201).send({ fileId: result.fileId, title: result.title, status: 'processing' });
  });

  // POST /batch — batch ingest (up to 50)
  fastify.post('/batch', { preHandler: [requireScope('write')] }, async (request, reply) => {
    const userId = request.user!.id;
    const body = request.body as {
      items: Array<{ content: string; title?: string; source?: string; tags?: string }>;
    };

    if (!body?.items || !Array.isArray(body.items) || body.items.length === 0) {
      return reply.status(400).send({ error: 'items array is required' });
    }
    if (body.items.length > 50) {
      return reply.status(400).send({ error: 'Maximum 50 items per batch' });
    }

    const fileIds: string[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      if (!item.content || typeof item.content !== 'string' || item.content.trim() === '') {
        errors.push({ index: i, error: 'content is required' });
        continue;
      }
      try {
        const result = await storeInboundItem(
          userId,
          (request as any).apiKeyId,
          (request as any).apiKeyName,
          item,
        );
        fileIds.push(result.fileId);
      } catch (err) {
        errors.push({ index: i, error: (err as Error).message });
      }
    }

    return reply.send({ processed: fileIds.length, fileIds, errors: errors.length > 0 ? errors : undefined });
  });

  // POST /email — email forward ingest
  fastify.post('/email', { preHandler: [requireScope('write')] }, async (request, reply) => {
    const userId = request.user!.id;
    const body = request.body as {
      from?: string;
      subject?: string;
      text?: string;
      html?: string;
      attachments?: unknown[];
    };

    // Determine content: prefer text, fallback to stripped HTML
    let content = body?.text || '';
    if (!content && body?.html) {
      // Basic HTML stripping
      content = body.html
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    if (!content || content.trim() === '') {
      return reply.status(400).send({ error: 'Email body is empty (no text or html content)' });
    }

    const from = body.from || 'unknown';
    const subject = body.subject || '';

    const result = await storeInboundItem(
      userId,
      (request as any).apiKeyId,
      (request as any).apiKeyName,
      {
        content,
        title: subject || undefined,
        source: `email-${from}`,
        tags: 'inbound-email',
      },
    );

    return reply.status(201).send({ fileId: result.fileId, title: result.title, status: 'processing' });
  });

  // GET /recent — recent inbound items
  fastify.get('/recent', async (request, reply) => {
    const userId = request.user!.id;
    const query = request.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit || '10'), 50);

    const activities = await db.select({
      id: schema.apiActivityLogs.id,
      action: schema.apiActivityLogs.action,
      detail: schema.apiActivityLogs.detail,
      metadata: schema.apiActivityLogs.metadata,
      agentName: schema.apiActivityLogs.agentName,
      createdAt: schema.apiActivityLogs.createdAt,
      relatedFileIds: schema.apiActivityLogs.relatedFileIds,
    })
      .from(schema.apiActivityLogs)
      .where(and(
        eq(schema.apiActivityLogs.userId, userId),
        eq(schema.apiActivityLogs.action, 'inbound'),
      ))
      .orderBy(desc(schema.apiActivityLogs.createdAt))
      .limit(limit);

    return reply.send({ items: activities });
  });
}
