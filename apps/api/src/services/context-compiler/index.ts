import { embedTexts } from '../../services/embedding.service.js';
import { searchSimilar, preprocessQuery } from '../../services/vector.service.js';
import type { CompileContextRequest, CompileContextResponse, KnowledgeFragment, SourceInfo } from './types.js';
import { estimateTokens } from './token-estimator.js';
import { resolveProfile } from './agent-profiles.js';

export { resolveProfile, registerProfile, listProfiles } from './agent-profiles.js';
export { estimateTokens } from './token-estimator.js';
export type { CompileContextRequest, CompileContextResponse, KnowledgeFragment, AgentProfile } from './types.js';

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
  const profile = resolveProfile(request.model?.name);
  const tokenBudget = request.tokenBudget || Math.min(8000, Math.floor(profile.contextWindow * 0.3));

  // Step 1: Query Expansion
  const queries = expandQueries(request.task);

  // Step 2: Retrieval
  const fragments = await retrieveFragments(userId, queries, request.hints);

  // Step 3: Score and rank
  const scored = scoreFragments(fragments, request.task);

  // Step 4: Budget allocation
  const { selected, coverage } = allocateBudget(scored, tokenBudget);

  // Step 5: Format output
  const compiledContext = formatOutput(selected, request.task, tokenBudget);
  const totalTokens = estimateTokens(compiledContext);

  return {
    compiledContext,
    metadata: {
      fragmentCount: selected.length,
      totalTokens,
      tokenBudget,
      compilationTimeMs: Date.now() - startTime,
      coverage,
      sources: buildSourceIndex(selected),
    },
  };
}
