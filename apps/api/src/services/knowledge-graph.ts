import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, or, inArray } from 'drizzle-orm';
import { embedTexts } from './embedding.service.js';
import { searchSimilar } from './vector.service.js';
import { chat } from './llm.service.js';

const SIMILARITY_THRESHOLD = 0.75;
const LLM_THRESHOLD = 0.8;
const MAX_CHECKS_PER_ITEM = 10;

const CLASSIFY_PROMPT = `You are a knowledge relationship classifier. Given two pieces of knowledge, determine their relationship.

Respond with ONLY one of these JSON objects:
{"relation": "supports", "confidence": 0.9} — A provides evidence or reasoning that strengthens B
{"relation": "contradicts", "confidence": 0.8} — A and B are in conflict or disagree
{"relation": "depends_on", "confidence": 0.85} — A requires B to be true or completed first
{"relation": "follows", "confidence": 0.9} — A is a natural continuation or consequence of B
{"relation": "related", "confidence": 0.7} — A and B are related but no specific directional relationship
{"relation": "none", "confidence": 0.0} — Not meaningfully related despite semantic similarity

Knowledge A: {a}

Knowledge B: {b}

Respond with ONLY the JSON object, nothing else.`;

export async function discoverRelationships(
  userId: string,
  fileId: string,
  content: string,
): Promise<Array<{ targetId: string; relation: string; confidence: number }>> {
  const results: Array<{ targetId: string; relation: string; confidence: number }> = [];

  try {
    // Find similar knowledge
    const [queryVec] = await embedTexts([content.slice(0, 500)]);
    const similar = await searchSimilar({
      userId,
      query: queryVec,
      scopeType: 'all',
      limit: MAX_CHECKS_PER_ITEM,
    });

    // Filter out self
    const candidates = similar.filter(s => s.fileId !== fileId && s.score >= SIMILARITY_THRESHOLD);

    for (const candidate of candidates) {
      // Check if edge already exists
      const existing = await db.select({ id: schema.knowledgeEdges.id })
        .from(schema.knowledgeEdges)
        .where(or(
          and(eq(schema.knowledgeEdges.sourceId, fileId), eq(schema.knowledgeEdges.targetId, candidate.fileId)),
          and(eq(schema.knowledgeEdges.sourceId, candidate.fileId), eq(schema.knowledgeEdges.targetId, fileId)),
        ))
        .limit(1);

      if (existing.length > 0) continue; // Already linked

      let relation = 'related';
      let confidence = candidate.score;

      // For high similarity, use LLM to classify specific relationship
      if (candidate.score >= LLM_THRESHOLD) {
        try {
          const prompt = CLASSIFY_PROMPT
            .replace('{a}', content.slice(0, 300))
            .replace('{b}', candidate.text.slice(0, 300));

          const response = await chat([
            { role: 'system', content: 'You classify knowledge relationships. Respond with JSON only.' },
            { role: 'user', content: prompt },
          ]);

          const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}');
          if (parsed.relation && parsed.relation !== 'none') {
            relation = parsed.relation;
            confidence = parsed.confidence || candidate.score;
          } else if (parsed.relation === 'none') {
            continue; // LLM says not related
          }
        } catch {
          // LLM classification failed, use default 'related'
        }
      }

      // Store the edge
      await db.insert(schema.knowledgeEdges).values({
        sourceId: fileId,
        targetId: candidate.fileId,
        relation,
        confidence,
        discoveredBy: 'auto',
      });

      results.push({ targetId: candidate.fileId, relation, confidence });
    }
  } catch (err) {
    console.error('[knowledge-graph] Discovery failed:', err);
  }

  return results;
}

// Get all edges for a file
export async function getFileRelationships(fileId: string): Promise<Array<{
  id: string;
  relatedFileId: string;
  relatedFileName: string;
  relation: string;
  confidence: number;
  direction: 'outgoing' | 'incoming';
}>> {
  // Get outgoing edges
  const outgoing = await db.select({
    id: schema.knowledgeEdges.id,
    targetId: schema.knowledgeEdges.targetId,
    relation: schema.knowledgeEdges.relation,
    confidence: schema.knowledgeEdges.confidence,
  })
    .from(schema.knowledgeEdges)
    .where(eq(schema.knowledgeEdges.sourceId, fileId));

  // Get incoming edges
  const incoming = await db.select({
    id: schema.knowledgeEdges.id,
    sourceId: schema.knowledgeEdges.sourceId,
    relation: schema.knowledgeEdges.relation,
    confidence: schema.knowledgeEdges.confidence,
  })
    .from(schema.knowledgeEdges)
    .where(eq(schema.knowledgeEdges.targetId, fileId));

  // Get file names
  const allFileIds = [
    ...outgoing.map(e => e.targetId),
    ...incoming.map(e => e.sourceId),
  ];

  if (allFileIds.length === 0) return [];

  const fileNames = await db.select({ id: schema.files.id, name: schema.files.name })
    .from(schema.files)
    .where(inArray(schema.files.id, allFileIds));

  const nameMap: Record<string, string> = {};
  fileNames.forEach(f => { nameMap[f.id] = f.name; });

  return [
    ...outgoing.map(e => ({
      id: e.id,
      relatedFileId: e.targetId,
      relatedFileName: nameMap[e.targetId] || 'Unknown',
      relation: e.relation,
      confidence: e.confidence,
      direction: 'outgoing' as const,
    })),
    ...incoming.map(e => ({
      id: e.id,
      relatedFileId: e.sourceId,
      relatedFileName: nameMap[e.sourceId] || 'Unknown',
      relation: e.relation,
      confidence: e.confidence,
      direction: 'incoming' as const,
    })),
  ];
}
