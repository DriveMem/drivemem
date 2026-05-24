/**
 * Reciprocal Rank Fusion (RRF) service.
 * Combines results from multiple ranked lists into a single fused ranking.
 *
 * Formula: score(d) = Σ 1 / (k + rank_i(d))
 * where k is a constant (default 60) and rank_i is 1-based rank in list i.
 */

export interface RRFInput {
  id: string;       // unique identifier (fileId + chunkIndex or just id)
  fileId: string;
  fileName: string;
  chunkIndex: number;
  text: string;
  score: number;    // original score from source
}

export interface RRFResult {
  id: string;
  fileId: string;
  fileName: string;
  chunkIndex: number;
  text: string;
  rrfScore: number;
  sources: Array<'bm25' | 'vector'>;
}

/**
 * Fuse two ranked result lists using RRF.
 *
 * @param bm25Results - Results from BM25 search, ordered by relevance
 * @param vectorResults - Results from vector search, ordered by relevance
 * @param k - RRF constant (default 60)
 * @returns Fused results sorted by RRF score descending
 */
export function fuseResults(
  bm25Results: RRFInput[],
  vectorResults: RRFInput[],
  k: number = 60,
): RRFResult[] {
  const scoreMap = new Map<string, {
    fileId: string;
    fileName: string;
    chunkIndex: number;
    text: string;
    rrfScore: number;
    sources: Set<'bm25' | 'vector'>;
  }>();

  // Helper to generate a dedup key
  const getKey = (r: RRFInput) => `${r.fileId}:${r.chunkIndex}`;

  // Process BM25 results
  bm25Results.forEach((r, rank) => {
    const key = getKey(r);
    const existing = scoreMap.get(key);
    const rrfContribution = 1 / (k + rank + 1); // rank is 0-based, formula uses 1-based

    if (existing) {
      existing.rrfScore += rrfContribution;
      existing.sources.add('bm25');
    } else {
      scoreMap.set(key, {
        fileId: r.fileId,
        fileName: r.fileName,
        chunkIndex: r.chunkIndex,
        text: r.text,
        rrfScore: rrfContribution,
        sources: new Set(['bm25']),
      });
    }
  });

  // Process vector results
  vectorResults.forEach((r, rank) => {
    const key = getKey(r);
    const existing = scoreMap.get(key);
    const rrfContribution = 1 / (k + rank + 1);

    if (existing) {
      existing.rrfScore += rrfContribution;
      existing.sources.add('vector');
    } else {
      scoreMap.set(key, {
        fileId: r.fileId,
        fileName: r.fileName,
        chunkIndex: r.chunkIndex,
        text: r.text,
        rrfScore: rrfContribution,
        sources: new Set(['vector']),
      });
    }
  });

  // Convert to array and sort by RRF score
  const results: RRFResult[] = [...scoreMap.entries()].map(([key, val]) => ({
    id: key,
    fileId: val.fileId,
    fileName: val.fileName,
    chunkIndex: val.chunkIndex,
    text: val.text,
    rrfScore: val.rrfScore,
    sources: [...val.sources],
  }));

  results.sort((a, b) => b.rrfScore - a.rrfScore);
  return results;
}
