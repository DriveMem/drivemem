import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { parseOffice } from 'officeparser';
import { AppError } from '../lib/errors.js';

const MAX_TEXT_LENGTH = 500_000;

export async function parseDocument(buffer: Buffer, mimeType: string): Promise<string> {
  let text: string;

  try {
    switch (mimeType) {
      case 'application/pdf': {
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();
        text = result.text;
        break;
      }
      case 'text/plain': {
        text = buffer.toString('utf-8');
        break;
      }
      case 'text/markdown': {
        const raw = buffer.toString('utf-8');
        text = raw
          .replace(/^#{1,6}\s+/gm, '')
          .replace(/\*\*(.+?)\*\*/g, '$1')
          .replace(/\*(.+?)\*/g, '$1')
          .replace(/__(.+?)__/g, '$1')
          .replace(/_(.+?)_/g, '$1')
          .replace(/~~(.+?)~~/g, '$1')
          .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, ''))
          .replace(/^\s*[-*+]\s+/gm, '')
          .replace(/^\s*\d+\.\s+/gm, '')
          .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
          .replace(/^\s*>\s?/gm, '')
          .replace(/^---+$/gm, '')
          .replace(/\|/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        break;
      }
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
        break;
      }
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        const ast = await parseOffice(buffer);
        text = ast.toText();
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

  // Detect protected/encrypted PDFs
  if (text.trim().length < 500 && /protected|password|encrypted/i.test(text)) {
    throw new AppError('PARSE_FAILED', 'Document appears to be password-protected or encrypted', 400);
  }

  if (text.length > MAX_TEXT_LENGTH) {
    console.warn('[parse] Text truncated from ' + text.length + ' to ' + MAX_TEXT_LENGTH + ' characters');
    text = text.slice(0, MAX_TEXT_LENGTH);
  }

  return text;
}
