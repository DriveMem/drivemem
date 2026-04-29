/**
 * Generate a descriptive title for auto-created notes based on content.
 *
 * Rules (#216):
 * - Extract first sentence or first 50 characters (whichever is shorter)
 * - Chinese: truncate by character count
 * - English: truncate at word boundary
 * - Append `…` if truncated
 * - Fallback to `Auto Note (日期时间)` if content is empty/whitespace
 * - Never override user-provided titles
 */

const MAX_CHARS = 50;

/**
 * Detect if text is predominantly CJK (Chinese/Japanese/Korean).
 */
function isCJKDominant(text: string): boolean {
  const cjk = text.match(/[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]/g);
  return !!cjk && cjk.length > text.length * 0.3;
}

/**
 * Extract first sentence from text (terminated by .!?。！？\n).
 */
function extractFirstSentence(text: string): string | null {
  const match = text.match(/^(.+?)[.!?。！？\n]/);
  return match ? match[1].trim() : null;
}

/**
 * Truncate text to MAX_CHARS with smart word/character boundary handling.
 */
function truncate(text: string): string {
  if (text.length <= MAX_CHARS) return text;

  if (isCJKDominant(text)) {
    // CJK: truncate by character count
    return text.slice(0, MAX_CHARS).trimEnd() + '…';
  }

  // English/Latin: truncate at word boundary
  const truncated = text.slice(0, MAX_CHARS);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > MAX_CHARS * 0.6) {
    return truncated.slice(0, lastSpace).trimEnd() + '…';
  }
  return truncated.trimEnd() + '…';
}

/**
 * Generate a content-based title for an auto note.
 *
 * @param content - The note content (markdown or plain text)
 * @returns A descriptive title, or a fallback with timestamp
 */
export function generateAutoNoteTitle(content: string | null | undefined): string {
  if (!content || !content.trim()) {
    return fallbackTitle();
  }

  // Strip markdown heading prefix if content starts with one
  let cleaned = content.trim().replace(/^#{1,6}\s+/, '');
  // Strip leading whitespace/newlines
  cleaned = cleaned.replace(/^\s+/, '');
  // Take only first line for sentence extraction
  const firstLine = cleaned.split(/\n/)[0].trim();

  if (!firstLine) {
    return fallbackTitle();
  }

  // Try first sentence (if shorter than MAX_CHARS)
  const sentence = extractFirstSentence(firstLine);
  if (sentence && sentence.length <= MAX_CHARS) {
    return sentence;
  }

  // Otherwise truncate first line
  return truncate(firstLine);
}

function fallbackTitle(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `Auto Note (${month}月${day}日 ${hours}:${minutes})`;
}
