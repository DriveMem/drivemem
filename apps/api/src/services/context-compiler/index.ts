import { inferDomain, extractSchema, isValidDomain } from './domain-schemas.js';
import { embedTexts } from '../../services/embedding.service.js';
import { searchSimilar, preprocessQuery } from '../../services/vector.service.js';
import type { CompileContextRequest, CompileContextResponse, KnowledgeFragment, SourceInfo, CompilationSnapshot, DepthLevel } from './types.js';
import { estimateTokens } from './token-estimator.js';
import { resolveProfile } from './agent-profiles.js';
import { LAYER_BUDGETS, DEPTH_LEVELS } from './types.js';
import { createHash } from 'crypto';

// --- Compilation cache for dedup (10-min TTL) ---
const CACHE_TTL_MS = 10 * 60 * 1000;
const compilationCache = new Map<string, { response: CompileContextResponse; snapshot: CompilationSnapshot }>();

function getCacheKey(userId: string, task: string): string {
  const hash = createHash('sha256').update(task).digest('hex').slice(0, 16);
  return `${userId}:${hash}`;
}

function pruneCache(): void {
  const now = Date.now();
  for (const [key, entry] of compilationCache) {
    if (now - entry.snapshot.compiledAt > CACHE_TTL_MS) {
      compilationCache.delete(key);
    }
  }
}

export { resolveProfile, registerProfile, listProfiles } from './agent-profiles.js';
export { ROLE_BOOSTS, inferRole } from './agent-profiles.js';
export { estimateTokens } from './token-estimator.js';
export { inferDomain, extractSchema, isValidDomain } from './domain-schemas.js';
export type { CompileContextRequest, CompileContextResponse, KnowledgeFragment, AgentProfile, CompilationSnapshot, DepthLevel } from './types.js';

/**
 * Infer depth from agent context window size.
 */
function inferDepthFromContextWindow(contextWindow: number): DepthLevel {
  if (contextWindow < 8000) return 'L1';
  if (contextWindow < 32000) return 'L2';
  if (contextWindow < 128000) return 'L3';
  return 'L4';
}

/**
 * Get available deeper layers beyond current depth.
 */
function getAvailableLayers(currentDepth: DepthLevel): string[] {
  const idx = DEPTH_LEVELS.indexOf(currentDepth);
  return DEPTH_LEVELS.slice(idx + 1) as unknown as string[];
}

/**
 * Expand a task description into multiple search queries for broader recall.
 */
function expandQueries(task: string): string[] {
  const queries: string[] = [task];

  // Extract a shorter keyword-focused query
  // Remove common filler words and keep substantive terms
  const keywords = task
    .replace(/[，。！？、；：""''【】《》（）\(\)\[\]\{\}]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1)
    .slice(0, 8)
    .join(' ');
  if (keywords && keywords !== task) {
    queries.push(keywords);
  }

  // If task is long enough, take first sentence as a focused query
  const firstSentence = task.split(/[.。!！?？\n]/)[0]?.trim();
  if (firstSentence && firstSentence !== task && firstSentence.length > 5) {
    queries.push(firstSentence);
  }

  return queries.slice(0, 3);
}

/**
 * Retrieve fragments from Qdrant vector store.
 */
async function retrieveFragments(
  userId: string,
  queries: string[],
  hints?: CompileContextRequest['hints'],
): Promise<KnowledgeFragment[]> {
  const allFragments = new Map<string, KnowledgeFragment>();

  for (const query of queries) {
    const processedQuery = preprocessQuery(query);
    const [queryVec] = await embedTexts([processedQuery]);

    // Determine scope based on hints
    const scopeType = hints?.folderId ? 'folder' : 'all';
    const scopeId = hints?.folderId;

    const results = await searchSimilar({
      userId,
      query: queryVec,
      scopeType,
      scopeId,
      limit: 15,
    });

    for (const r of results) {
      // Use fileId + chunkIndex as dedup key
      const key = `${r.fileId}-${r.chunkIndex}`;
      if (!allFragments.has(key) || allFragments.get(key)!.relevanceScore < r.score) {
        allFragments.set(key, {
          id: key,
          fileId: r.fileId,
          fileName: r.fileName,
          text: r.text,
          relevanceScore: r.score,
          chunkIndex: r.chunkIndex,
        });
      }
    }
  }

  // Return up to 30 fragments
  return Array.from(allFragments.values()).slice(0, 30);
}

/**
 * Score and sort fragments by relevance.
 */
function scoreFragments(fragments: KnowledgeFragment[], _task: string): KnowledgeFragment[] {
  // Qdrant already provides relevance scores with time decay applied by vector.service
  // Just sort descending
  return [...fragments].sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Allocate token budget greedily across scored fragments.
 */
function allocateBudget(
  scored: KnowledgeFragment[],
  tokenBudget: number,
): { selected: KnowledgeFragment[]; coverage: 'full' | 'partial' | 'insufficient' } {
  const selected: KnowledgeFragment[] = [];
  const effectiveBudget = Math.floor(tokenBudget * 0.9); // 10% margin for formatting
  let usedTokens = 0;

  for (const fragment of scored) {
    const fragmentTokens = estimateTokens(fragment.text);
    if (usedTokens + fragmentTokens > effectiveBudget) {
      // Budget exhausted
      if (selected.length < scored.length) {
        return { selected, coverage: selected.length < 3 ? 'insufficient' : 'partial' };
      }
      break;
    }
    selected.push(fragment);
    usedTokens += fragmentTokens;
  }

  // Determine coverage
  if (selected.length < 3 || (selected.length > 0 && selected[0].relevanceScore < 0.5)) {
    return { selected, coverage: 'insufficient' };
  }

  return { selected, coverage: 'full' };
}

/**
 * Format selected fragments into structured markdown output.
 */
function formatOutput(
  selected: KnowledgeFragment[],
  task: string,
  tokenBudget: number,
): string {
  if (selected.length === 0) {
    return `# Task Context\n> Compiled for: ${task}\n> No relevant knowledge found in the knowledge base.\n`;
  }

  const totalTokens = selected.reduce((sum, f) => sum + estimateTokens(f.text), 0);
  const coverage = selected.length < 3 ? 'insufficient' : 'full';

  const lines: string[] = [
    '# Task Context',
    `> Compiled for: ${task}`,
    `> Budget: ${totalTokens}/${tokenBudget} tokens | Sources: ${selected.length} fragments | Coverage: ${coverage}`,
    '',
    '## Key Knowledge',
    '',
  ];

  // Group fragments by file for cleaner output
  const byFile = new Map<string, KnowledgeFragment[]>();
  for (const f of selected) {
    const existing = byFile.get(f.fileId) || [];
    existing.push(f);
    byFile.set(f.fileId, existing);
  }

  for (const [, fragments] of byFile) {
    lines.push(`### From: ${fragments[0].fileName}`);
    for (const f of fragments) {
      lines.push('');
      lines.push(f.text);
    }
    lines.push('');
  }

  // Source index
  lines.push('## Sources');
  const sourceEntries: { fileName: string; score: number; tokens: number }[] = [];
  for (const [, fragments] of byFile) {
    const tokens = fragments.reduce((sum, f) => sum + estimateTokens(f.text), 0);
    const topScore = Math.max(...fragments.map(f => f.relevanceScore));
    sourceEntries.push({ fileName: fragments[0].fileName, score: topScore, tokens });
  }
  sourceEntries.sort((a, b) => b.score - a.score);
  sourceEntries.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.fileName} (relevance: ${s.score.toFixed(2)}, tokens: ${s.tokens})`);
  });

  return lines.join('\n');
}

/**
 * Build source index from selected fragments.
 */
function buildSourceIndex(selected: KnowledgeFragment[]): SourceInfo[] {
  const byFile = new Map<string, { fileId: string; fileName: string; topScore: number; tokens: number }>();
  for (const f of selected) {
    const existing = byFile.get(f.fileId);
    const fragmentTokens = estimateTokens(f.text);
    if (existing) {
      existing.topScore = Math.max(existing.topScore, f.relevanceScore);
      existing.tokens += fragmentTokens;
    } else {
      byFile.set(f.fileId, { fileId: f.fileId, fileName: f.fileName, topScore: f.relevanceScore, tokens: fragmentTokens });
    }
  }

  return Array.from(byFile.values())
    .map(s => ({ fileId: s.fileId, fileName: s.fileName, relevanceScore: s.topScore, tokensUsed: s.tokens }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Main entry point: compile task-relevant context from user's knowledge base.
 */
export async function compileContext(
  userId: string,
  request: CompileContextRequest,
): Promise<CompileContextResponse> {
  const startTime = Date.now();

  // --- Cache dedup: return cached result if same task compiled within 10 min ---
  pruneCache();
  const cacheKey = getCacheKey(userId, request.task);
  const cached = compilationCache.get(cacheKey);
  if (cached && Date.now() - cached.snapshot.compiledAt < CACHE_TTL_MS && !request.since) {
    return cached.response;
  }

  const profile = resolveProfile(request.model?.name);
  // Apply role override from request
  if (request.role) {
    profile.role = request.role;
  }

  // Auto-detect role/domain if not specified
  if (!request.role || !request.outputSchema) {
    try {
      const { detectCapabilities } = await import('../capability-detector.js');
      const detected = await detectCapabilities(userId, {
        agentName: request.model?.name,
        taskText: request.task,
      });
      if (!request.role && detected.role !== 'general' && detected.confidence > 0.3) {
        profile.role = detected.role;
      }
      if (!request.outputSchema && detected.domain !== 'general' && detected.confidence > 0.3) {
        request.outputSchema = detected.domain;
      }
    } catch { /* best-effort */ }
  }

  // --- Resolve depth ---
  let depth: DepthLevel = request.depth || 'L3';
  if (!request.depth && request.model?.contextWindow) {
    depth = inferDepthFromContextWindow(request.model.contextWindow);
  } else if (!request.depth && profile.contextWindow) {
    depth = inferDepthFromContextWindow(profile.contextWindow);
  }

  // Determine token budget: layer budget is the default, user can override for L4
  const layerBudget = LAYER_BUDGETS[depth];
  const tokenBudget = depth === 'L4'
    ? (request.tokenBudget || Math.min(layerBudget, Math.floor(profile.contextWindow * 0.3)))
    : Math.min(request.tokenBudget || layerBudget, layerBudget);

  // Step 1: Query Expansion
  const queries = expandQueries(request.task);

  // Step 2: Retrieval
  const rawFragments = await retrieveFragments(userId, queries, request.hints);

  // Step 2.5: Graph expansion — follow Work Graph edges for related knowledge
  let graphExpandedCount = 0;
  try {
    const { getFileRelationships } = await import('../knowledge-graph.js');
    const retrievedFileIds = [...new Set(rawFragments.map(f => f.fileId))];

    for (const fid of retrievedFileIds.slice(0, 3)) {
      const relationships = await getFileRelationships(fid);

      for (const rel of relationships) {
        if (['supports', 'depends_on'].includes(rel.relation) && rel.confidence > 0.7) {
          // Skip if already present in fragments
          if (rawFragments.some(f => f.fileId === rel.relatedFileId)) continue;

          // Get file summary as a lightweight fragment
          const { db } = await import('../../db/index.js');
          const { files } = await import('../../db/schema.js');
          const { eq } = await import('drizzle-orm');
          const [file] = await db.select({
            id: files.id,
            name: files.name,
            summary: files.summary,
          })
            .from(files)
            .where(eq(files.id, rel.relatedFileId));

          if (file?.summary) {
            rawFragments.push({
              id: `graph-${file.id}`,
              fileId: file.id,
              fileName: file.name,
              text: `[Via ${rel.relation} relationship] ${file.summary}`,
              relevanceScore: 0.6,
              chunkIndex: 0,
            });
            graphExpandedCount++;
          }
        }
      }
    }
  } catch { /* graph expansion is best-effort */ }

  // Step 2.6: Apply feedback weights
  const { applyFeedbackWeights } = await import('../feedback-weights.js');
  const weightedAsScore = rawFragments.map(f => ({ ...f, fileId: f.fileId, score: f.relevanceScore }));
  const reweighted = await applyFeedbackWeights(userId, weightedAsScore);
  const fragments = reweighted.map(f => ({ ...f, relevanceScore: f.score }));

  // Step 2.7: Role-based content routing
  let roleBoostApplied = false;
  if (profile.role && profile.role !== 'general') {
    const { ROLE_BOOSTS } = await import('./agent-profiles.js');
    const boosts = ROLE_BOOSTS[profile.role] || {};
    if (Object.keys(boosts).length > 0) {
      // Get file names for tag inference
      const fileIds = [...new Set(fragments.map(f => f.fileId))];
      const { db } = await import('../../db/index.js');
      const { files } = await import('../../db/schema.js');
      const { inArray } = await import('drizzle-orm');
      const fileRecords = fileIds.length > 0
        ? await db.select({ id: files.id, name: files.name }).from(files).where(inArray(files.id, fileIds))
        : [];
      const fileNameMap: Record<string, string> = {};
      fileRecords.forEach(f => { fileNameMap[f.id] = f.name; });

      for (const f of fragments) {
        let maxBoost = 1.0;
        const fileName = (fileNameMap[f.fileId] || f.fileName || '').toLowerCase();

        // Check auto-capture type from filename
        if (fileName.includes('auto-capture')) {
          const typeMatch = fileName.match(/auto-capture-[\d-T]+-(\w+)/);
          if (typeMatch && boosts[typeMatch[1]]) {
            maxBoost = Math.max(maxBoost, boosts[typeMatch[1]]);
          }
        }

        // Check content keywords for boost
        const text = f.text.toLowerCase();
        for (const [tag, boost] of Object.entries(boosts)) {
          if (text.includes(tag)) {
            maxBoost = Math.max(maxBoost, boost);
            break;
          }
        }

        f.relevanceScore *= maxBoost;
      }

      fragments.sort((a, b) => b.relevanceScore - a.relevanceScore);
      roleBoostApplied = true;
    }
  }

  // Step 3: Score and rank
  const scored = scoreFragments(fragments, request.task);

  // Step 3.5: Depth-aware fragment filtering
  // L1/L2 prefer summary-type content over raw document chunks
  let depthFiltered = scored;
  if (depth === 'L1' || depth === 'L2') {
    const summaryFragments = scored.filter(f =>
      f.text.toLowerCase().includes('summary') ||
      f.text.startsWith('[Via ') ||
      f.fileName.toLowerCase().includes('summary') ||
      f.fileName.toLowerCase().includes('auto-capture')
    );
    // Use summary fragments if we have enough, otherwise fall back to top-scored
    if (summaryFragments.length >= 2) {
      depthFiltered = summaryFragments;
    } else {
      // For L1, take only top fragments by score
      depthFiltered = scored.slice(0, depth === 'L1' ? 5 : 10);
    }
  }

  // Step 4: Budget allocation
  const { selected, coverage } = allocateBudget(depthFiltered, tokenBudget);

  // Step 5: Format output
  const compiledContext = formatOutput(selected, request.task, tokenBudget);
  const totalTokens = estimateTokens(compiledContext);

  // --- Incremental diff logic ---
  let diff: CompileContextResponse['diff'] | undefined;
  if (request.since) {
    const sinceTime = new Date(request.since).getTime();
    if (!isNaN(sinceTime)) {
      // Fetch updatedAt for selected fragments' files
      const fileIds = [...new Set(selected.map(f => f.fileId))];
      let fileTimestamps: Record<string, number> = {};
      try {
        const { db } = await import('../../db/index.js');
        const { files } = await import('../../db/schema.js');
        const { inArray } = await import('drizzle-orm');
        if (fileIds.length > 0) {
          const fileRows = await db.select({ id: files.id, updatedAt: files.updatedAt }).from(files).where(inArray(files.id, fileIds));
          for (const row of fileRows) {
            fileTimestamps[row.id] = new Date(row.updatedAt).getTime();
          }
        }
      } catch { /* best-effort */ }

      // Compare with previous snapshot
      const previousSnapshot = cached?.snapshot;
      const previousIds = previousSnapshot?.fragmentIds || new Set<string>();
      const currentIds = new Set(selected.map(f => f.id));

      const added: KnowledgeFragment[] = [];
      const updated: KnowledgeFragment[] = [];
      const removed: string[] = [];

      for (const f of selected) {
        const fileUpdatedAt = fileTimestamps[f.fileId] || 0;
        if (!previousIds.has(f.id)) {
          // New fragment not in previous snapshot
          if (fileUpdatedAt > sinceTime) {
            added.push(f);
          }
        } else if (fileUpdatedAt > sinceTime) {
          // Existed before but file was updated since
          updated.push(f);
        }
      }

      // Fragments in previous snapshot but not in current
      if (previousSnapshot) {
        for (const prevId of previousSnapshot.fragmentIds) {
          if (!currentIds.has(prevId)) {
            removed.push(prevId);
          }
        }
      }

      diff = { added, updated, removed };
    }
  }

  // --- Store snapshot in cache ---
  const snapshot: CompilationSnapshot = {
    fragments: selected,
    fragmentIds: new Set(selected.map(f => f.id)),
    timestamp: new Date().toISOString(),
    compiledAt: Date.now(),
  };

  // --- Domain Schema extraction ---
  const rawDomain = request.outputSchema || profile.domain || inferDomain(request.task);
  const domain = isValidDomain(rawDomain) ? rawDomain : 'general';
  const schema = domain !== 'general' ? extractSchema(domain, selected) : undefined;

  const response: CompileContextResponse = {
    compiledContext,
    metadata: {
      fragmentCount: selected.length,
      totalTokens,
      tokenBudget,
      compilationTimeMs: Date.now() - startTime,
      coverage,
      sources: buildSourceIndex(selected),
      graphExpanded: graphExpandedCount,
      depth,
      availableLayers: getAvailableLayers(depth),
    },
    ...(domain !== 'general' ? { domain } : {}),
    ...(schema ? { schema } : {}),
    ...(diff ? { diff } : {}),
  };

  compilationCache.set(cacheKey, { response, snapshot });

  return response;
}
