import { encode } from 'gpt-tokenizer';

const TARGET_CHUNK_TOKENS = 800;
const OVERLAP_TOKENS = 100;
const SEPARATORS = ['\n\n', '\n', '. ', ' ', ''];

function tokenLength(text: string): number {
  return encode(text).length;
}

function splitBySeparator(text: string, separator: string): string[] {
  if (separator === '') {
    return [...text];
  }
  return text.split(separator).filter(Boolean);
}

function recursiveSplit(text: string, separators: string[]): string[] {
  if (tokenLength(text) <= TARGET_CHUNK_TOKENS) {
    return text.trim() ? [text] : [];
  }

  const sep = separators[0];
  const remainingSeps = separators.length > 1 ? separators.slice(1) : separators;
  const parts = splitBySeparator(text, sep);

  const results: string[] = [];
  let current = '';

  for (const part of parts) {
    const candidate = current ? current + sep + part : part;
    if (tokenLength(candidate) <= TARGET_CHUNK_TOKENS) {
      current = candidate;
    } else {
      if (current) {
        results.push(current);
      }
      if (tokenLength(part) > TARGET_CHUNK_TOKENS && separators.length > 1) {
        results.push(...recursiveSplit(part, remainingSeps));
        current = '';
      } else {
        current = part;
      }
    }
  }
  if (current) {
    results.push(current);
  }

  return results;
}

export function chunkText(text: string, fileName: string): Array<{ text: string; index: number }> {
  if (!text || text.trim().length === 0) return [];

  const rawChunks = recursiveSplit(text, SEPARATORS);

  // Apply overlap
  const chunks: string[] = [];
  for (let i = 0; i < rawChunks.length; i++) {
    if (i === 0) {
      chunks.push(rawChunks[i]);
    } else {
      // Get overlap from end of previous chunk
      const prevTokens = encode(rawChunks[i - 1]);
      const overlapTokens = prevTokens.slice(-OVERLAP_TOKENS);
      // Decode overlap tokens back to text - approximate by taking chars from end
      const prevText = rawChunks[i - 1];
      let overlapText = '';
      if (overlapTokens.length > 0) {
        // Estimate chars per token ~4
        const overlapCharCount = Math.min(overlapTokens.length * 4, prevText.length);
        overlapText = prevText.slice(-overlapCharCount);
      }
      chunks.push(overlapText + rawChunks[i]);
    }
  }

  return chunks.map((chunk, index) => ({
    text: `[${fileName}] 第 ${index + 1} 段：${chunk}`,
    index,
  }));
}
