/**
 * BM25 Sparse Vector Tokenizer for Qdrant hybrid search.
 *
 * Converts text into a sparse vector (indices + values) where:
 * - Each unique token is hashed via FNV-1a to a uint32 index
 * - The value is the term frequency (TF)
 * - No IDF needed — Qdrant's sparse search handles ranking internally
 */

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'in', 'on', 'at', 'to', 'for', 'of',
  'and', 'or', 'but', 'not', 'with', 'this', 'that', 'it', 'be',
  'are', 'was', 'were', 'been', 'has', 'have', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'shall', 'from', 'by', 'as', 'if', 'then', 'than', 'so', 'no',
  'up', 'out', 'about', 'into', 'over', 'after', 'its', 'my', 'your',
  'his', 'her', 'our', 'their', 'we', 'you', 'he', 'she', 'they',
  'me', 'him', 'us', 'them', 'who', 'what', 'which', 'when', 'where',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'only', 'own', 'same', 'just', 'also',
  // Chinese stop words
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人',
  '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
  '你', '会', '着', '没有', '看', '好', '自己', '这',
]);

/** FNV-1a hash → uint32 */
function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0; // FNV prime, keep uint32
  }
  return hash;
}

export interface SparseVector {
  indices: number[];
  values: number[];
}

export function tokenizeBM25(text: string): SparseVector {
  // Lowercase + remove punctuation + split by whitespace
  const cleaned = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));

  // Count term frequencies
  const tf = new Map<number, number>();
  for (const token of cleaned) {
    const idx = fnv1aHash(token);
    tf.set(idx, (tf.get(idx) ?? 0) + 1);
  }

  // Convert to sorted arrays (Qdrant expects sorted indices for sparse vectors)
  const entries = [...tf.entries()].sort((a, b) => a[0] - b[0]);

  return {
    indices: entries.map(([idx]) => idx),
    values: entries.map(([, count]) => count),
  };
}
