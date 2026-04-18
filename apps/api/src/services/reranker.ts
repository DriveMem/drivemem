import { chat } from './llm.service.js';

export interface RerankableResult {
  fileId: string;
  fileName: string;
  text: string;
  score: number;
  [key: string]: unknown;
}

const MAX_RERANK = 15;
const RERANK_TIMEOUT_MS = 3000;

/**
 * Re-rank search results using LLM cross-encoder scoring.
 * Gracefully falls back to original order on any failure.
 */
export async function rerankResults<T extends RerankableResult>(
  query: string,
  results: T[],
  topK: number = 5,
): Promise<T[]> {
  if (results.length <= topK) return results;

  const toRerank = results.slice(0, MAX_RERANK);
  const rest = results.slice(MAX_RERANK);

  const snippets = toRerank.map((r, i) =>
    `${i}: ${r.fileName} — ${r.text.slice(0, 200).replace(/\n/g, ' ')}`
  ).join('\n');

  const prompt = `Given this search query, rank these search results by relevance. Return ONLY a JSON array of indices sorted from most to least relevant. No explanation.

Query: ${query}

Results:
${snippets}

Return format: [most_relevant_index, next, ...]`;

  try {
    const response = await Promise.race([
      chat([{ role: 'user', content: prompt }]),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('rerank timeout')), RERANK_TIMEOUT_MS)
      ),
    ]);

    // Extract JSON array from response
    const match = response.match(/\[[\d\s,]+\]/);
    if (!match) return results;

    const indices: number[] = JSON.parse(match[0]);

    // Validate indices
    const valid = indices.filter(i => Number.isInteger(i) && i >= 0 && i < toRerank.length);
    if (valid.length === 0) return results;

    // Build reranked list: ordered indices first, then any missing indices
    const seen = new Set(valid);
    const reranked: T[] = [];
    for (const idx of valid) {
      reranked.push(toRerank[idx]);
    }
    for (let i = 0; i < toRerank.length; i++) {
      if (!seen.has(i)) reranked.push(toRerank[i]);
    }

    return [...reranked, ...rest];
  } catch {
    // Graceful fallback: return original order
    return results;
  }
}
