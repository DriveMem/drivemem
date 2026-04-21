import { FastifyInstance } from 'fastify';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { requireAuth } from '../plugins/auth.js';

// --- File type classification ---
type FileCategory = 'pdf' | 'code' | 'note' | 'image' | 'spreadsheet' | 'generic';

function classifyFile(name: string, mimeType: string): FileCategory {
  if (mimeType === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (/\.(xlsx?|csv|tsv)$/i.test(name) || mimeType.includes('spreadsheet') || mimeType.includes('csv')) return 'spreadsheet';
  if (/\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|h|rb|php|swift|kt)$/i.test(name) || mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('python')) return 'code';
  if (/\.(md|txt|rtf|doc|docx)$/i.test(name) || mimeType.includes('text/') || mimeType.includes('document')) return 'note';
  return 'generic';
}

function friendlyName(name: string): string {
  // Remove extension and clean up
  return name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
}

interface Prompt { text: string; icon?: string }

// --- Template-based prompt generation ---
function generatePrompts(files: { name: string; mimeType: string; summary: string | null }[]): Prompt[] {
  const prompts: Prompt[] = [];
  const used = new Set<string>();

  // Group by category
  const byCategory = new Map<FileCategory, typeof files>();
  for (const f of files) {
    const cat = classifyFile(f.name, f.mimeType);
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(f);
  }

  // PDF prompts
  const pdfs = byCategory.get('pdf') || [];
  if (pdfs.length > 0 && prompts.length < 3) {
    const f = pdfs[0];
    prompts.push({ text: `Summarize the key points from "${friendlyName(f.name)}"`, icon: '📄' });
    used.add(f.name);
  }

  // Code prompts
  const code = byCategory.get('code') || [];
  if (code.length > 0 && prompts.length < 3) {
    const f = code[0];
    prompts.push({ text: `Explain the architecture of "${friendlyName(f.name)}"`, icon: '💻' });
    used.add(f.name);
  }

  // Spreadsheet prompts
  const sheets = byCategory.get('spreadsheet') || [];
  if (sheets.length > 0 && prompts.length < 3) {
    const f = sheets[0];
    prompts.push({ text: `What are the key trends in "${friendlyName(f.name)}"?`, icon: '📊' });
    used.add(f.name);
  }

  // Note / document prompts
  const notes = byCategory.get('note') || [];
  if (notes.length > 1 && prompts.length < 3) {
    prompts.push({ text: 'What insights can you find across my recent notes?', icon: '💡' });
  } else if (notes.length === 1 && prompts.length < 3) {
    const f = notes[0];
    if (!used.has(f.name)) {
      prompts.push({ text: `What are the main ideas in "${friendlyName(f.name)}"?`, icon: '📝' });
    }
  }

  // Cross-file insight prompt if we have multiple files
  if (files.length >= 3 && prompts.length < 3) {
    prompts.push({ text: 'What connections exist between my recent files?', icon: '🔗' });
  }

  // Image prompt
  const images = byCategory.get('image') || [];
  if (images.length > 0 && prompts.length < 3) {
    const f = images[0];
    prompts.push({ text: `Describe what's in "${friendlyName(f.name)}"`, icon: '🖼️' });
  }

  // Fill remaining with generic useful prompts
  const fillers: Prompt[] = [
    { text: 'What decisions have been made across my files?', icon: '🎯' },
    { text: 'Give me a summary of everything in my knowledge base', icon: '📋' },
    { text: 'What should I focus on based on my files?', icon: '🔍' },
  ];
  for (const filler of fillers) {
    if (prompts.length >= 3) break;
    if (!prompts.some(p => p.text === filler.text)) prompts.push(filler);
  }

  return prompts.slice(0, 3);
}

// --- Default static prompts (fallback) ---
const DEFAULT_PROMPTS: Prompt[] = [
  { text: 'What decisions have been made?', icon: '🎯' },
  { text: 'What are the key insights from my files?', icon: '💡' },
  { text: 'Summarize everything in my knowledge base', icon: '📋' },
];

export default async function quickPromptRoutes(app: FastifyInstance) {
  // GET /api/quick-prompts
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    try {
      // Query last 10 indexed files
      const recentFiles = await db
        .select({
          name: schema.files.name,
          mimeType: schema.files.mimeType,
          summary: schema.files.summary,
        })
        .from(schema.files)
        .where(
          and(
            eq(schema.files.userId, userId),
            eq(schema.files.status, 'indexed'),
            isNull(schema.files.deletedAt),
            isNull(schema.files.archivedAt),
          )
        )
        .orderBy(desc(schema.files.createdAt))
        .limit(10);

      if (recentFiles.length === 0) {
        return reply.send({ prompts: DEFAULT_PROMPTS });
      }

      const prompts = generatePrompts(recentFiles);
      return reply.send({ prompts });
    } catch (err) {
      request.log.error(err, 'Failed to generate quick prompts');
      return reply.send({ prompts: DEFAULT_PROMPTS });
    }
  });
}
