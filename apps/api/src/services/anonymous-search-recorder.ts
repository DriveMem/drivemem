import crypto from 'node:crypto';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

function hashQuery(query: string): string {
  return crypto.createHash('sha256').update(normalizeQuery(query)).digest('hex').slice(0, 16);
}

function categorizeQuery(query: string): string {
  const q = query.toLowerCase();
  if (/code|function|api|bug|error|debug/.test(q)) return 'engineering';
  if (/design|ui|ux|layout|color/.test(q)) return 'design';
  if (/meeting|decision|team|project/.test(q)) return 'management';
  if (/price|cost|plan|billing/.test(q)) return 'business';
  return 'general';
}

export async function recordAnonymousSearchSignal(params: {
  query: string;
  resultCount: number;
  hadClick: boolean;
  source: 'web_search' | 'mcp_search' | 'mcp_ask';
}): Promise<void> {
  try {
    await db.insert(schema.anonymousSearchSignals).values({
      queryHash: hashQuery(params.query),
      queryCategory: categorizeQuery(params.query),
      resultCount: params.resultCount,
      hadClick: params.hadClick,
      source: params.source,
    });
  } catch { /* non-blocking */ }
}
