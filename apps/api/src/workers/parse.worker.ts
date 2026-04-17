import { Worker, Job, UnrecoverableError, Queue } from 'bullmq';
import { createNotificationDeduped } from '../services/notification.service.js';
import { eq, and, sql } from 'drizzle-orm';
import { config } from '../lib/config.js';
import { AppError } from '../lib/errors.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { files } from '../db/schema.js';
import { getObject } from '../services/s3.service.js';
import { parseDocument } from '../services/parse.service.js';
import { chunkText } from '../services/chunk.service.js';
import { embedTexts } from '../services/embedding.service.js';

/**
 * Truncate text at a semantic boundary (sentence end, newline, comma) near maxLen.
 * Avoids cutting in the middle of Chinese characters or mid-sentence.
 */
function truncateAtBoundary(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;

  // Search backwards from maxLen for a good break point
  const searchStart = Math.max(0, maxLen - 200);
  const candidates = text.substring(searchStart, maxLen);

  // Prefer: Chinese period, period+space, newline, semicolon, comma variants
  const breakChars = ['。', '.\n', '\n\n', '\n', '；', '；', '. ', '，', ','];
  let bestPos = -1;

  for (const ch of breakChars) {
    const idx = candidates.lastIndexOf(ch);
    if (idx !== -1) {
      bestPos = searchStart + idx + ch.length;
      break;
    }
  }

  if (bestPos > 0) {
    return text.substring(0, bestPos).trimEnd();
  }

  // Fallback: substring is safe for JS strings (UTF-16 code units won't split
  // a character when using string.substring on well-formed strings), but trim
  // any trailing lone high surrogate just in case.
  let end = maxLen;
  const code = text.charCodeAt(end - 1);
  if (code >= 0xD800 && code <= 0xDBFF) end--;

  return text.substring(0, end);
}
import { ensureCollection, upsertChunks } from '../services/vector.service.js';
import IORedis from 'ioredis';

interface ParseJobData {
  fileId: string;
  userId: string;
  s3Key: string;
  mimeType: string;
}

const connection = new IORedis.default(config.REDIS_URL, {
  maxRetriesPerRequest: null,
});

await ensureCollection();

const worker = new Worker<ParseJobData>(
  'file-parse',
  async (job: Job<ParseJobData>) => {
    const { fileId, userId, s3Key, mimeType } = job.data;
    console.log('[file-parse] Processing job ' + job.id + ' for file ' + fileId);

    try {
      const buffer = await getObject(s3Key);
      const text = await parseDocument(buffer, mimeType);

      const [file] = await db.select({ name: files.name, folderId: files.folderId, previousVersionId: files.previousVersionId })
        .from(files).where(eq(files.id, fileId));

      const chunks = chunkText(text, file?.name ?? 'unknown');

      if (chunks.length === 0) {
        throw new AppError('PARSE_FAILED', 'No chunks generated from document', 400);
      }

      const chunkTexts = chunks.map((c) => c.text);
      const embeddings = await embedTexts(chunkTexts);

      await upsertChunks({
        userId,
        fileId,
        folderId: file?.folderId ?? null,
        fileName: file?.name ?? 'unknown',
        chunks,
        embeddings,
      });

      await db.update(files).set({
        status: 'indexed',
        chunkCount: chunks.length,
        updatedAt: new Date(),
      }).where(eq(files.id, fileId));

      console.log('[file-parse] File ' + fileId + ' indexed with ' + chunks.length + ' chunks');

      // Dispatch webhook: file.indexed
      try {
        const { dispatchWebhook } = await import('../services/webhook.service.js');
        await dispatchWebhook(userId, 'file.indexed', { fileId, fileName: file?.name });
      } catch { /* non-blocking */ }

      // Notification: file_indexed — silenced (UX #240 F2: noise reduction)
      // await db.insert(schema.notifications).values({
      //   userId,
      //   type: 'file_indexed',
      //   title: '📄 文件已索引',
      //   message: `「${file?.name}」已完成 AI 解析，可以开始提问了`,
      // });

      // Clear insight cache so it regenerates with new file data
      await db.update(schema.users).set({ insight: null }).where(eq(schema.users.id, userId));

// Auto-generate summary after successful indexing
    try {
      const { chat } = await import('../services/llm.service.js');
      const chunkTexts = truncateAtBoundary(chunks.map((c: { text: string }) => c.text).join('\n\n'), 3000);
      const summaryPrompt = '请用中文为以下文档内容生成一段简洁的摘要（不超过200字），概括文档的主要内容和关键信息：\n\n' + chunkTexts;
      const summary = await chat([{ role: 'user', content: summaryPrompt }]);
      if (summary) {
        await db.update(files).set({ summary }).where(eq(files.id, fileId));
        console.log('[file-parse] Summary generated for ' + fileId);

        // Auto-tag: generate 2-3 tags based on summary
        try {
          const tagPrompt = `基于以下文件摘要，生成2-3个分类标签。只从以下选项中选择：spec、decision、report、meeting、research、tutorial、analysis、test、config、note。只返回逗号分隔的标签，不要其他文字。\n\n摘要：${summary.substring(0, 200)}`;
          const tagResult = await chat([{ role: 'user', content: tagPrompt }]);
          const tagNames = tagResult.split(',').map((t: string) => t.trim().toLowerCase()).filter((t: string) => t.length > 0 && t.length < 20).slice(0, 3);
          
          const tagColors: Record<string, string> = {
            spec: '#3B82F6', decision: '#F59E0B', report: '#10B981', meeting: '#8B5CF6',
            research: '#EC4899', tutorial: '#06B6D4', analysis: '#F97316', test: '#6B7280',
            config: '#64748B', note: '#A855F7',
          };
          
          for (const tagName of tagNames) {
            // Find or create tag
            let [existingTag] = await db.select().from(schema.tags)
              .where(and(eq(schema.tags.userId, userId), eq(schema.tags.name, tagName)));
            
            if (!existingTag) {
              [existingTag] = await db.insert(schema.tags).values({
                name: tagName,
                color: tagColors[tagName] || '#6B7280',
                userId,
              }).returning();
            }
            
            if (existingTag) {
              // Check if file-tag link exists
              const [existingLink] = await db.select().from(schema.fileTags)
                .where(and(eq(schema.fileTags.fileId, fileId), eq(schema.fileTags.tagId, existingTag.id)));
              if (!existingLink) {
                await db.insert(schema.fileTags).values({ fileId, tagId: existingTag.id });
              }
            }
          }
          console.log('[file-parse] Auto-tagged ' + fileId + ': ' + tagNames.join(', '));
        } catch (tagErr) {
          console.warn('[file-parse] Auto-tag failed (non-blocking):', (tagErr as Error).message);
        }

        // Dispatch webhook: summary.generated
        try {
          const { dispatchWebhook } = await import('../services/webhook.service.js');
          await dispatchWebhook(userId, 'summary.generated', { fileId, fileName: file?.name, summary });
        } catch { /* non-blocking */ }

        // Notification: summary_generated — silenced (UX #240 F2: noise reduction)
        // await db.insert(schema.notifications).values({
        //   userId,
        //   type: 'summary_generated',
        //   title: '📝 AI 摘要已生成',
        //   message: `「${file?.name}」的 AI 摘要已自动生成`,
        // });
      }
    } catch (summaryErr) {
      console.warn('[file-parse] Summary generation failed (non-blocking):', (summaryErr as Error).message);
    }

    // File version comparison
    if (file?.previousVersionId) {
      try {
        const [oldFile] = await db.select({ summary: files.summary, name: files.name })
          .from(files)
          .where(eq(files.id, file.previousVersionId));

        const [currentFile] = await db.select({ summary: files.summary }).from(files).where(eq(files.id, fileId));
        const currentSummary = currentFile?.summary;

        if (oldFile?.summary && currentSummary) {
          const { chat } = await import('../services/llm.service.js');
          const diffPrompt = `对比以下两个版本的变化，50字以内：\n旧版本摘要：${oldFile.summary.substring(0, 200)}\n新版本摘要：${currentSummary.substring(0, 200)}`;
          const diff = await chat([{ role: 'user', content: diffPrompt }]);

          await createNotificationDeduped({
            userId,
            type: 'file_updated',
            title: '📄 文件已更新',
            message: `「${file.name}」更新了 — ${diff.trim().slice(0, 100)}`,
          });
          console.log('[file-parse] Version diff notification created for ' + fileId);
        }
      } catch (diffErr) {
        console.warn('[file-parse] Version diff failed (non-blocking):', (diffErr as Error).message);
      }
    }

// Auto-suggest folder classification
    try {
      const userFolders = await db.select({ id: schema.folders.id, name: schema.folders.name })
        .from(schema.folders)
        .where(eq(schema.folders.userId, userId));

      const [currentFile] = await db.select({ summary: files.summary }).from(files).where(eq(files.id, fileId));
      const fileSummary = currentFile?.summary;

      if (userFolders.length > 0 && fileSummary) {
        const { chat } = await import('../services/llm.service.js');
        const folderNames = userFolders.map(f => f.name).join('、');
        const classifyPrompt = `文件摘要：${fileSummary}\n\n用户的文件夹列表：${folderNames}\n\n这个文件最适合放入哪个文件夹？规则：只输出文件夹名称本身，禁止输出任何解释、括号、推理过程。如果都不合适，只输出"无"。`;
        const suggested = await chat([{ role: 'user', content: classifyPrompt }]);
        const trimmed = suggested?.trim().replace(/["""]/g, '');

        if (trimmed && trimmed !== '无' && trimmed !== 'null') {
          await db.update(files).set({ suggestedFolder: trimmed }).where(eq(files.id, fileId));
          console.log('[file-parse] Suggested folder for ' + fileId + ': ' + trimmed);
        }
      }
    } catch (classifyErr) {
      console.warn('[file-parse] Classification failed (non-blocking):', (classifyErr as Error).message);
    }

// Knowledge link discovery
    try {
      const otherFiles = await db.select({
        id: schema.files.id,
        name: schema.files.name,
        summary: schema.files.summary
      })
        .from(schema.files)
        .where(and(
          eq(schema.files.userId, userId),
          sql`${schema.files.summary} IS NOT NULL`,
          sql`${schema.files.id} != ${fileId}`
        ));

      const [currentFileForLinks] = await db.select({ summary: files.summary }).from(files).where(eq(files.id, fileId));
      const currentSummary = currentFileForLinks?.summary;

      if (otherFiles.length > 0 && currentSummary) {
        const { chat } = await import('../services/llm.service.js');
        const fileList = otherFiles.map(f => `[${f.name}]: ${f.summary?.substring(0, 150)}`).join('\n');
        const linkPrompt = `当前文件：${file?.name ?? fileId}\n摘要：${currentSummary.substring(0, 200)}\n\n其他文件：\n${fileList}\n\n分析当前文件和每个其他文件的关联。对于有明确关联的文件对，输出一行：\n文件名|关联类型|描述\n\n关联类型只能是：similar（主题相似）、complementary（信息互补）、contradictory（观点矛盾）\n描述用中文，不超过30字。\n如果没有关联，输出"无"。`;

        const linkResult = await chat([{ role: 'user', content: linkPrompt }]);
        const lines = linkResult.split('\n').filter(l => l.includes('|'));

        for (const line of lines) {
          const [fileName, relType, desc] = line.split('|').map(s => s.trim());
          if (!fileName || !relType || !desc) continue;
          if (!['similar', 'complementary', 'contradictory'].includes(relType)) continue;

          const matchedFile = otherFiles.find(f => f.name.includes(fileName) || fileName.includes(f.name));
          if (matchedFile) {
            const existing = await db.select().from(schema.knowledgeLinks).where(
              sql`(file_a_id = ${fileId} AND file_b_id = ${matchedFile.id}) OR (file_a_id = ${matchedFile.id} AND file_b_id = ${fileId})`
            );
            if (existing.length === 0) {
              await db.insert(schema.knowledgeLinks).values({
                userId,
                fileAId: fileId,
                fileBId: matchedFile.id,
                relationType: relType,
                description: desc,
              });
              console.log(`[file-parse] Knowledge link: ${fileId} <-> ${matchedFile.id} (${relType})`);
            }
          }
        }

        // Notification: knowledge links found (one per file)
        if (lines.length > 0) {
          await createNotificationDeduped({
            userId,
            type: 'knowledge_link_found',
            title: '🔗 发现知识关联',
            message: `AI 发现「${file?.name}」和其他文件存在关联`,
          });
        }
      }
    } catch (linkErr) {
      console.warn('[file-parse] Knowledge link discovery failed (non-blocking):', (linkErr as Error).message);
    }

    // Dispatch insight generation job
    try {
      const insightQueue = new Queue('insight-generate', { connection: { host: 'localhost', port: 6379 } });
      await insightQueue.add('generate', { fileId, userId });
      await insightQueue.close();
    } catch { /* non-blocking */ }

    } catch (err) {
      if (err instanceof AppError && err.code === 'PARSE_FAILED') {
        throw new UnrecoverableError(err.message);
      }
      throw err;
    }
  },
  {
    connection,
    concurrency: 2,
    lockDuration: 5 * 60 * 1000,
  },
);

worker.on('completed', (job) => {
  console.log('[file-parse] Job ' + job.id + ' completed');
});

worker.on('failed', async (job, err) => {
  console.error('[file-parse] Job failed:', err.message);
  if (job) {
    const { fileId } = job.data as ParseJobData;
    try {
      await db.update(files).set({
        status: 'failed',
        errorMessage: err.message,
        updatedAt: new Date(),
      }).where(eq(files.id, fileId));
    } catch (dbErr) {
      console.error('[file-parse] DB update failed:', dbErr);
    }
  }
});

worker.on('error', (err) => {
  console.error('[file-parse] Worker error:', err);
});

console.log('[file-parse] Worker started');
