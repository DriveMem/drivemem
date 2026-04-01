// @ts-expect-error pdf-parse types
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { AppError } from '../lib/errors.js';

const MAX_TEXT_LENGTH = 500_000;

export async function parseDocument(buffer: Buffer, mimeType: string): Promise<string> {
  let text: string;

  try {
    switch (mimeType) {
      case 'application/pdf': {
        const result = await pdfParse(buffer);
        text = result.text;
        break;
      }
      case 'text/plain': {
        text = buffer.toString('utf-8');
        break;
      }
      case 'text/markdown': {
        const raw = buffer.toString('utf-8');
        // Strip markdown formatting
        text = raw
          .replace(/^#{1,6}\s+/gm, '')          // headings
          .replace(/\*\*(.+?)\*\*/g, '$1')       // bold
          .replace(/\*(.+?)\*/g, '$1')            // italic
          .replace(/__(.+?)__/g, '$1')            // bold alt
          .replace(/_(.+?)_/g, '$1')              // italic alt
          .replace(/~~(.+?)~~/g, '$1')            // strikethrough
          .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, '')) // inline/block code
          .replace(/^\s*[-*+]\s+/gm, '')          // unordered list
          .replace(/^\s*\d+\.\s+/gm, '')          // ordered list
          .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // links/images
          .replace(/^\s*>\s?/gm, '')              // blockquotes
          .replace(/^---+$/gm, '')                // horizontal rules
          .replace(/\|/g, ' ')                    // table pipes
          .replace(/\n{3,}/g, '\n\n')             // collapse whitespace
          .trim();
        break;
      }
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
        break;
      }
      default:
        throw new AppError('PARSE_FAILED', `Unsupported mime type: ${mimeType}`, 400);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('PARSE_FAILED', `Failed to parse document: ${(err as Error).message}`, 500);
  }

  if (!text || text.trim().length === 0) {
    throw new AppError('PARSE_FAILED', 'Document contains no extractable text', 400);
  }

  if (text.length > MAX_TEXT_LENGTH) {
    console.warn(`[parse] Text truncated from ${text.length} to ${MAX_TEXT_LENGTH} characters`);
    text = text.slice(0, MAX_TEXT_LENGTH);
  }

  return text;
}
