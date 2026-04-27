import { db } from '../db/index.js';
import * as schema from '../db/schema.js';

export async function recordCitations(params: {
  userId: string;
  fileIds: string[];
  source: 'compile' | 'search' | 'ask' | 'mcp_search';
  query?: string;
  agentName?: string;
}): Promise<void> {
  if (!params.fileIds.length) return;
  const unique = [...new Set(params.fileIds)];
  try {
    await db.insert(schema.citationEvents).values(
      unique.map(fileId => ({
        userId: params.userId,
        fileId,
        source: params.source,
        query: params.query?.slice(0, 500),
        agentName: params.agentName,
      }))
    );
  } catch { /* non-blocking */ }
}
