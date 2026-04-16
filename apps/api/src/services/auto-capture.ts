import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';
import { chat } from './llm.service.js';
import { embedTexts } from './embedding.service.js';
import { searchSimilar } from './vector.service.js';
import { uploadObject } from './s3.service.js';
import { fileParseQueue } from '../lib/queue.js';
import { randomUUID } from 'crypto';

const EXTRACTION_PROMPT = `You are a knowledge extraction engine. Analyze the conversation below and extract ONLY genuinely valuable knowledge items.

Extract these types:
- Decisions (what was decided and why)
- Conclusions (analysis results, findings)
- Architecture choices (technical decisions)
- User preferences (stated preferences or patterns)
- Action items (TODOs, next steps)
- Key facts (important data points)

DO NOT extract:
- Greetings or small talk
- Questions without answers
- Pure code without conclusions
- Obvious/trivial information

For each item, output JSON array:
[
  {
    "title": "Brief descriptive title",
    "content": "The extracted knowledge in 1-3 clear sentences",
    "type": "decision|analysis|engineering|preference|action-item|fact",
    "importance": "high|medium|low"
  }
]

Only extract items with importance "high" or "medium". Return empty array [] if nothing valuable found.

CONVERSATION:
`;

const MAX_DAILY_CAPTURES = 50;

export interface CaptureResult {
  captured: number;
  skipped: number;
  items: Array<{ title: string; fileId: string }>;
}

export async function autoCapture(
  userId: string,
  conversationContent: string,
  options?: { sessionId?: string; projectId?: string }
): Promise<CaptureResult> {
  // Check daily limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [dailyCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(schema.files)
    .where(and(
      eq(schema.files.userId, userId),
      gte(schema.files.createdAt, today),
      sql`${schema.files.name} LIKE 'auto-capture-%'`
    ));

  if ((dailyCount?.count || 0) >= MAX_DAILY_CAPTURES) {
    return { captured: 0, skipped: 0, items: [] };
  }

  // Extract knowledge using LLM
  const extraction = await chat([
    { role: 'system', content: EXTRACTION_PROMPT },
    { role: 'user', content: conversationContent.slice(0, 8000) }
  ]);

  // Parse extraction result
  let items: Array<{ title: string; content: string; type: string; importance: string }> = [];
  try {
    const jsonMatch = extraction.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      items = JSON.parse(jsonMatch[0]);
    }
  } catch {
    return { captured: 0, skipped: 0, items: [] };
  }

  if (!items.length) {
    return { captured: 0, skipped: 0, items: [] };
  }

  // Filter: only high/medium importance
  items = items.filter(i => i.importance === 'high' || i.importance === 'medium');

  // Semantic dedup: check if similar knowledge already exists
  const result: CaptureResult = { captured: 0, skipped: 0, items: [] };

  for (const item of items) {
    // Check for duplicates
    try {
      const [queryVec] = await embedTexts([item.content]);
      const similar = await searchSimilar({ userId, query: queryVec, scopeType: 'all', limit: 1 });
      if (similar.length > 0 && similar[0].score > 0.9) {
        result.skipped++;
        continue;
      }
    } catch {
      // If dedup fails, still capture
    }

    // Store the knowledge
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `auto-capture-${timestamp}-${item.type}.md`;

    const mdContent = `# ${item.title}\n\n${item.content}\n\n---\n_Auto-captured | Type: ${item.type} | ${new Date().toLocaleString()}_`;

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
      folderId: options?.projectId || null,
    });

    // Queue for parsing/embedding
    await fileParseQueue.add('parse', { fileId, userId, s3Key, mimeType: 'text/markdown' });

    result.captured++;
    result.items.push({ title: item.title, fileId });
  }

  return result;
}
