import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';

const TYPE_EMOJI: Record<string, string> = {
  bug: '🐛',
  suggestion: '💡',
  confused: '🤔',
};

async function createGitHubIssue(opts: {
  type: string;
  content: string;
  email: string | null;
  page: string | null;
  userAgent: string | null;
  userId: string | null;
}) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // "owner/repo"
  if (!token || !repo) return;

  const emoji = TYPE_EMOJI[opts.type] || '💬';
  const title = `[Feedback] ${emoji} ${opts.type}: ${opts.content.slice(0, 60)}`;
  const body = [
    `**Type**: ${emoji} ${opts.type}`,
    opts.page ? `**Page**: ${opts.page}` : null,
    opts.email ? `**User**: ${opts.email}${opts.userId ? ` (uid: ${opts.userId})` : ''}` : (opts.userId ? `**User ID**: ${opts.userId}` : null),
    opts.userAgent ? `**Browser**: ${opts.userAgent}` : null,
    '',
    '---',
    '',
    opts.content,
  ].filter(Boolean).join('\n');

  const labels = ['user-feedback', opts.type];

  try {
    await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, body, labels }),
    });
  } catch (err) {
    console.error('[feedback] Failed to create GitHub issue:', err);
  }
}

const VALID_TYPES = ['bug', 'suggestion', 'confused'] as const;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5;

// Simple in-memory rate limiter (keyed by userId or IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export default async function feedbackRoutes(fastify: FastifyInstance) {
  // POST / — submit feedback (logged in or anonymous)
  fastify.post('/', async (request, reply) => {
    const body = request.body as {
      content: string;
      type?: string;
      email?: string;
      page?: string;
    };

    if (!body.content || body.content.trim().length === 0) {
      return reply.status(400).send({ error: 'Feedback content is required' });
    }

    if (body.content.trim().length > 500) {
      return reply.status(400).send({ error: 'Feedback must be 500 characters or less' });
    }

    const feedbackType = body.type && VALID_TYPES.includes(body.type as any)
      ? body.type
      : 'suggestion';

    const userId = request.user?.id || null;
    const rateLimitKey = userId || request.ip || 'anonymous';

    if (!checkRateLimit(rateLimitKey)) {
      return reply.status(429).send({ error: 'Too many feedback submissions. Please try again later.' });
    }

    const userAgent = request.headers['user-agent'] || null;

    await db.insert(schema.feedback).values({
      userId,
      type: feedbackType,
      content: body.content.trim().slice(0, 500),
      email: body.email?.trim().slice(0, 200) || null,
      page: body.page?.slice(0, 200) || null,
      userAgent,
    });

    // Create GitHub Issue in background (non-blocking)
    createGitHubIssue({
      type: feedbackType,
      content: body.content.trim().slice(0, 500),
      email: body.email?.trim().slice(0, 200) || null,
      page: body.page?.slice(0, 200) || null,
      userAgent,
      userId,
    });

    return reply.status(201).send({ message: 'Thanks for your feedback!' });
  });
}
