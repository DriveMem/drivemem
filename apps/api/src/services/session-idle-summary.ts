/**
 * Session Idle Summary — auto-extract knowledge when MCP session goes idle for 10min.
 *
 * Tracks tool call history per session. When a session is idle for 10 minutes
 * (or disconnects), generates an LLM summary of the session's tool interactions
 * and stores valuable insights into the knowledge base.
 */

import { chat } from './llm.service.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { uploadObject } from './s3.service.js';
import { randomUUID } from 'crypto';
import { logActivity } from './activity-logger.js';

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const MIN_TOOL_CALLS = 3;

interface ToolCallRecord {
  toolName: string;
  argsSummary: string;
  timestamp: number;
}

interface SessionState {
  userId: string;
  agentName: string;
  toolCalls: ToolCallRecord[];
  idleTimer: ReturnType<typeof setTimeout> | null;
  summarized: boolean;
}

const sessionMap = new Map<string, SessionState>();

function summarizeArgs(args: Record<string, unknown> | undefined): string {
  if (!args) return '';
  // Pick the most informative arg (query, question, content, task, etc.)
  for (const key of ['query', 'question', 'content', 'task', 'summary', 'filename']) {
    if (typeof args[key] === 'string') {
      return (args[key] as string).slice(0, 200);
    }
  }
  // Fallback: stringify first few keys
  const str = JSON.stringify(args);
  return str.slice(0, 200);
}

/**
 * Call on every tool call to track history and reset idle timer.
 */
export function trackToolCall(
  sessionId: string,
  userId: string,
  agentName: string,
  toolName: string,
  args?: Record<string, unknown>,
): void {
  let state = sessionMap.get(sessionId);
  if (!state) {
    state = { userId, agentName, toolCalls: [], idleTimer: null, summarized: false };
    sessionMap.set(sessionId, state);
  }

  state.toolCalls.push({
    toolName,
    argsSummary: summarizeArgs(args),
    timestamp: Date.now(),
  });

  // Keep max 50 records
  if (state.toolCalls.length > 50) {
    state.toolCalls = state.toolCalls.slice(-50);
  }

  // Reset idle timer
  if (state.idleTimer) clearTimeout(state.idleTimer);
  state.idleTimer = setTimeout(() => {
    triggerSummary(sessionId, 'idle');
  }, IDLE_TIMEOUT_MS);
  state.idleTimer.unref(); // Don't block process exit
}

/**
 * Call when session disconnects (SSE close / Streamable HTTP DELETE).
 */
export function onSessionDisconnect(sessionId: string): void {
  const state = sessionMap.get(sessionId);
  if (!state) return;

  // Clear idle timer
  if (state.idleTimer) {
    clearTimeout(state.idleTimer);
    state.idleTimer = null;
  }

  // Trigger summary then cleanup
  triggerSummary(sessionId, 'disconnect').finally(() => {
    sessionMap.delete(sessionId);
  });
}

async function triggerSummary(sessionId: string, trigger: 'idle' | 'disconnect'): Promise<void> {
  const state = sessionMap.get(sessionId);
  if (!state) return;
  if (state.summarized) return;
  if (state.toolCalls.length < MIN_TOOL_CALLS) return;

  state.summarized = true;

  try {
    // Build tool call history for the prompt
    const historyLines = state.toolCalls.map(tc => {
      const t = new Date(tc.timestamp).toISOString().slice(11, 19);
      return `[${t}] ${tc.toolName}: ${tc.argsSummary}`;
    });

    const prompt = `Based on these tool interactions from an AI agent session, extract key decisions, conclusions, or action items. If nothing valuable, respond with 'SKIP'. Max 150 words.

Agent: ${state.agentName || 'unknown'}
Tool interactions:
${historyLines.join('\n')}`;

    const result = await chat([{ role: 'user', content: prompt }]);

    if (!result || result.trim().toUpperCase() === 'SKIP') return;

    // Store as a note in the knowledge base
    const title = `Session Summary — ${state.agentName || 'unknown'} (${new Date().toISOString().slice(0, 10)})`;
    const mdContent = `# ${title}\n\n${result}\n\n---\n_Auto-generated from ${state.toolCalls.length} tool calls. Trigger: ${trigger}._`;

    const fileId = randomUUID();
    const filename = `session-summary-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.md`;
    const s3Key = `users/${state.userId}/files/${fileId}/${filename}`;
    const buffer = Buffer.from(mdContent, 'utf-8');

    await uploadObject(s3Key, buffer, 'text/markdown');

    await db.insert(schema.files).values({
      id: fileId,
      name: filename,
      originalName: filename,
      mimeType: 'text/markdown',
      size: buffer.length,
      status: 'parsing',
      userId: state.userId,
      s3Key,
    });

    // Enqueue for parsing/indexing
    const { Queue } = await import('bullmq');
    const queue = new Queue('file-parse', { connection: { host: 'localhost', port: 6379 } });
    await queue.add('parse', { fileId, userId: state.userId, s3Key, mimeType: 'text/markdown' });
    await queue.close();

    // Add tags: session-summary, auto-accumulated
    for (const tagName of ['session-summary', 'auto-accumulated']) {
      try {
        let [existing] = await db.select().from(schema.tags)
          .where(and(eq(schema.tags.userId, state.userId), eq(schema.tags.name, tagName)));
        if (!existing) {
          [existing] = await db.insert(schema.tags).values({
            name: tagName,
            color: tagName === 'session-summary' ? '#3B82F6' : '#6B7280',
            userId: state.userId,
          }).returning();
        }
        if (existing) {
          await db.insert(schema.fileTags).values({ fileId, tagId: existing.id });
        }
      } catch { /* skip tag errors */ }
    }

    // Log activity
    logActivity({
      userId: state.userId,
      agentName: state.agentName || undefined,
      action: 'session_summary',
      detail: `Session idle summary: ${state.toolCalls.length} tool calls`,
      metadata: { trigger, toolCallCount: state.toolCalls.length, fileId },
    });
  } catch (e) {
    console.error('[session-idle-summary] Failed:', (e as Error).message);
  }
}
