import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, and, gte, isNotNull } from 'drizzle-orm';
import { embedTexts } from './embedding.service.js';

const SIMILARITY_THRESHOLD = 0.7;

interface DetectionResult {
  projectId: string | null;
  projectName: string | null;
  method: 'explicit' | 'api-key-binding' | 'semantic' | 'recent-active' | 'default';
  confidence: number;
}

export async function detectProject(
  userId: string,
  options: {
    explicitProjectId?: string;
    apiKeyId?: string;
    content?: string;
  }
): Promise<DetectionResult> {
  // Priority 1: Explicit project ID
  if (options.explicitProjectId) {
    const [folder] = await db.select({ id: schema.folders.id, name: schema.folders.name })
      .from(schema.folders)
      .where(and(eq(schema.folders.id, options.explicitProjectId), eq(schema.folders.userId, userId)));
    if (folder) {
      return { projectId: folder.id, projectName: folder.name, method: 'explicit', confidence: 1.0 };
    }
  }

  // Priority 2: API Key binding (check if API key has a default project)
  if (options.apiKeyId) {
    const [apiKey] = await db.select({ defaultProjectId: schema.apiKeys.defaultProjectId })
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.id, options.apiKeyId));
    if (apiKey?.defaultProjectId) {
      const [folder] = await db.select({ id: schema.folders.id, name: schema.folders.name })
        .from(schema.folders)
        .where(eq(schema.folders.id, apiKey.defaultProjectId));
      if (folder) {
        return { projectId: folder.id, projectName: folder.name, method: 'api-key-binding', confidence: 0.95 };
      }
    }
  }

  // Priority 3: Semantic matching
  if (options.content && options.content.length > 10) {
    const folders = await db.select({
      id: schema.folders.id,
      name: schema.folders.name,
      brief: schema.folders.brief,
      goal: schema.folders.goal,
    })
      .from(schema.folders)
      .where(eq(schema.folders.userId, userId));

    if (folders.length > 0) {
      const folderTexts = folders.map(f =>
        [f.name, f.brief, f.goal].filter(Boolean).join(' ')
      );

      try {
        const [contentVec] = await embedTexts([options.content.slice(0, 500)]);
        const folderVecs = await embedTexts(folderTexts);

        let bestMatch = { index: -1, score: 0 };
        for (let i = 0; i < folderVecs.length; i++) {
          const score = cosineSimilarity(contentVec, folderVecs[i]);
          if (score > bestMatch.score) {
            bestMatch = { index: i, score };
          }
        }

        if (bestMatch.score >= SIMILARITY_THRESHOLD && bestMatch.index >= 0) {
          const folder = folders[bestMatch.index];
          return { projectId: folder.id, projectName: folder.name, method: 'semantic', confidence: bestMatch.score };
        }
      } catch {
        // If embedding fails, continue to next strategy
      }
    }
  }

  // Priority 4: Most recently active project (last 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentFiles = await db.select({ folderId: schema.files.folderId })
    .from(schema.files)
    .where(and(
      eq(schema.files.userId, userId),
      gte(schema.files.createdAt, oneHourAgo),
      isNotNull(schema.files.folderId),
    ))
    .orderBy(desc(schema.files.createdAt))
    .limit(5);

  const recentFolderIds = recentFiles
    .map(f => f.folderId)
    .filter((id): id is string => id !== null);

  if (recentFolderIds.length > 0) {
    const counts: Record<string, number> = {};
    recentFolderIds.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    const mostFrequent = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

    if (mostFrequent) {
      const [folder] = await db.select({ id: schema.folders.id, name: schema.folders.name })
        .from(schema.folders)
        .where(eq(schema.folders.id, mostFrequent[0]));
      if (folder) {
        return { projectId: folder.id, projectName: folder.name, method: 'recent-active', confidence: 0.6 };
      }
    }
  }

  // Priority 5: Default (no project)
  return { projectId: null, projectName: null, method: 'default', confidence: 0 };
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}
