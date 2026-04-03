import { Worker, Job, UnrecoverableError } from 'bullmq';
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

      const [file] = await db.select({ name: files.name, folderId: files.folderId })
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

// Auto-generate summary after successful indexing
    try {
      const { chat } = await import('../services/llm.service.js');
      const chunkTexts = truncateAtBoundary(chunks.map((c: { text: string }) => c.text).join('\n\n'), 3000);
      const summaryPrompt = '请用中文为以下文档内容生成一段简洁的摘要（不超过200字），概括文档的主要内容和关键信息：\n\n' + chunkTexts;
      const summary = await chat([{ role: 'user', content: summaryPrompt }]);
      if (summary) {
        await db.update(files).set({ summary }).where(eq(files.id, fileId));
        console.log('[file-parse] Summary generated for ' + fileId);
      }
    } catch (summaryErr) {
      console.warn('[file-parse] Summary generation failed (non-blocking):', (summaryErr as Error).message);
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
        const classifyPrompt = `文件摘要：${fileSummary}\n\n用户的文件夹列表：${folderNames}\n\n这个文件最适合放入哪个文件夹？只返回文件夹名称。如果都不合适，返回"无"。`;
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
      }
    } catch (linkErr) {
      console.warn('[file-parse] Knowledge link discovery failed (non-blocking):', (linkErr as Error).message);
    }

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
