/**
 * Auto-Accumulate: Seamless Knowledge Accumulation from MCP Tool Calls
 *
 * Fire-and-forget analysis of search/ask interactions.
 * Extracts valuable insights and stores them back into the knowledge base.
 */

import { chat } from './llm.service.js';
import { embedTexts } from './embedding.service.js';
import { searchSimilar } from './vector.service.js';
import { uploadObject } from './s3.service.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { Queue } from 'bullmq';

// --- Rate limiting: per-user daily cap ---
const dailyCounters = new Map<string, { date: string; count: number }>();
const MAX_DAILY = 50;

function canAccumulate(userId: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const entry = dailyCounters.get(userId);
  if (!entry || entry.date !== today) {
    dailyCounters.set(userId, { date: today, count: 0 });
    return true;
  }
  return entry.count < MAX_DAILY;
}

function incrementCounter(userId: string): void {
  const today = new Date().toISOString().slice(0, 10);
  const entry = dailyCounters.get(userId);
  if (!entry || entry.date !== today) {
    dailyCounters.set(userId, { date: today, count: 1 });
  } else {
    entry.count++;
  }
}

// --- Decision-word heuristic ---
const DECISION_WORDS = /\b(decided|chose|concluded|should|must|recommend|determined|resolved|agreed|established|confirmed|selected)\b/i;

function isWorthAnalyzing(query: string, result: string): boolean {
  if (query.length > 50) return true;
  if (DECISION_WORDS.test(result)) return true;
  return false;
}

// --- LLM summary extraction ---
const EXTRACT_SYSTEM = `Extract one key insight or decision from this AI interaction. If nothing valuable, respond with 'SKIP'. Max 100 words.`;

async function extractInsight(toolName: string, query: string, result: string): Promise<string | null> {
  // Truncate to avoid blowing up context
  const truncatedResult = result.slice(0, 3000);
  const userMsg = `Tool: ${toolName}\nQuery: ${query}\n\nResult:\n${truncatedResult}`;

  const response = await chat([
    { role: 'system', content: EXTRACT_SYSTEM },
    { role: 'user', content: userMsg },
  ]);

  const trimmed = response.trim();
  if (!trimmed || trimmed.toUpperCase() === 'SKIP' || trimmed.length < 10) {
    return null;
  }
  return trimmed;
}

// --- Semantic dedup ---
async function isDuplicate(userId: string, insight: string): Promise<boolean> {
  try {
    const [vec] = await embedTexts([insight]);
    const results = await searchSimilar({ userId, query: vec, scopeType: 'all', limit: 1 });
    if (results.length > 0 && results[0].score > 0.92) {
      return true;
    }
  } catch {
    // If dedup check fails, proceed with storing
  }
  return false;
}

// --- Store logic (mirrors aidrive_store in create-server.ts) ---
async function storeInsight(userId: string, insight: string): Promise<void> {
  const title = insight.slice(0, 50).replace(/\n/g, ' ');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `auto-${timestamp}.md`;
  const mdContent = `# ${title}\n\n${insight}\n\n---\n_Auto-accumulated: ${new Date().toLocaleString('zh-CN')}_`;

  const fileId = randomUUID();
  const s3Key = `users/${userId}/files/${fileId}/${filename}`;
  const buffer = Buffer.from(mdContent, 'utf-8');

  await uploadObject(s3Key, buffer, 'text/markdown');

  await db.insert(schema.files).values({
    id: fileId,
    name: filename,
    originalName: filename,
    mimeType: 'text/markdown',
    size: buffer.length,
    status: 'parsing',
    userId,
    s3Key,
    source: 'auto-note',
  });

  // Tag with auto-accumulated
  try {
    let [tag] = await db.select().from(schema.tags)
      .where(and(eq(schema.tags.userId, userId), eq(schema.tags.name, 'auto-accumulated')));
    if (!tag) {
      [tag] = await db.insert(schema.tags).values({
        name: 'auto-accumulated',
        color: '#6366F1',
        isSystem: true, userId,
      }).returning();
    }
    if (tag) {
      await db.insert(schema.fileTags).values({ fileId, tagId: tag.id });
    }
  } catch { /* skip tag errors */ }

  // Trigger parse worker
  const queue = new Queue('file-parse', { connection: { host: 'localhost', port: 6379 } });
  await queue.add('parse', { fileId, userId, s3Key, mimeType: 'text/markdown' });
  await queue.close();
}

/**
 * Fire-and-forget: analyze a tool call result and maybe store an insight.
 * Call this without awaiting — it handles its own errors.
 */
export function maybeAccumulate(
  userId: string,
  toolName: string,
  query: string,
  result: string,
): void {
  // Only process search/ask
  if (toolName !== 'aidrive_search' && toolName !== 'aidrive_ask') return;

  // Rate limit check (sync, fast)
  if (!canAccumulate(userId)) return;

  // Heuristic check (sync, fast)
  if (!isWorthAnalyzing(query, result)) return;

  // Fire and forget the async pipeline
  void (async () => {
    try {
      const insight = await extractInsight(toolName, query, result);
      if (!insight) return;

      if (await isDuplicate(userId, insight)) return;

      await storeInsight(userId, insight);
      incrementCounter(userId);

      // Work Graph: extract work items from accumulated insight
      import('./work-item-extractor.js').then(({ extractWorkItems }) => {
        extractWorkItems(userId, insight).catch(() => {});
      }).catch(() => {});

      console.log(`[auto-accumulate] Stored insight for user ${userId}: ${insight.slice(0, 60)}...`);
    } catch (err) {
      console.error('[auto-accumulate] Error:', (err as Error).message);
    }
  })();
}
