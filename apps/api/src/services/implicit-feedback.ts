/**
 * Implicit Feedback — Agent Loop 1
 *
 * Tracks search → subsequent-action correlation.
 * If an agent searches and later uses a file (ask/compile/store) → positive implicit feedback (×1.1).
 * If a file is returned by search but unused within 30 min → negative implicit feedback (×0.85).
 *
 * All operations are fire-and-forget; they never block the request path.
 */

import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

// ── Types ──────────────────────────────────────────────────────────────

interface PendingEntry {
  fileIds: string[];
  resolvedFileIds: Set<string>;
  returnedAt: Date;
  timer: ReturnType<typeof setTimeout>;
}

// ── In-memory store ────────────────────────────────────────────────────

// Key: `${userId}:${apiKeyId}:${timestamp}`
const pendingFeedback = new Map<string, PendingEntry>();

const FEEDBACK_TTL_MS = 30 * 60 * 1000; // 30 minutes
const POSITIVE_MULTIPLIER = 1.1;
const NEGATIVE_MULTIPLIER = 0.85;

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Record file IDs returned by a search. Called after search completes.
 */
export function recordSearchResults(
  userId: string,
  apiKeyId: string | undefined,
  fileIds: string[],
): void {
  if (fileIds.length === 0) return;

  const key = `${userId}:${apiKeyId ?? 'anonymous'}:${Date.now()}`;

  const timer = setTimeout(() => {
    expireEntry(key, userId, apiKeyId);
  }, FEEDBACK_TTL_MS);

  // Prevent timer from keeping the process alive
  if (timer.unref) timer.unref();

  pendingFeedback.set(key, {
    fileIds,
    resolvedFileIds: new Set(),
    returnedAt: new Date(),
    timer,
  });
}

/**
 * Resolve pending feedback when a subsequent action references files.
 * Called from ask / compile / store routes.
 * Fire-and-forget — caller should not await this.
 */
export function resolveImplicitFeedback(
  userId: string,
  apiKeyId: string | undefined,
  referencedFileIds: string[],
): void {
  if (referencedFileIds.length === 0) return;

  const refSet = new Set(referencedFileIds);
  const keyPrefix = `${userId}:${apiKeyId ?? 'anonymous'}:`;

  for (const [key, entry] of pendingFeedback) {
    if (!key.startsWith(keyPrefix)) continue;

    const matched = entry.fileIds.filter(fid => refSet.has(fid));
    for (const fid of matched) {
      if (!entry.resolvedFileIds.has(fid)) {
        entry.resolvedFileIds.add(fid);
        // Positive implicit feedback — fire-and-forget
        persistFeedback(userId, fid, 'useful', POSITIVE_MULTIPLIER).catch(() => {});
      }
    }

    // If all files resolved, clean up early
    if (entry.resolvedFileIds.size >= entry.fileIds.length) {
      clearTimeout(entry.timer);
      pendingFeedback.delete(key);
    }
  }
}

// ── Internal ───────────────────────────────────────────────────────────

function expireEntry(
  key: string,
  userId: string,
  _apiKeyId: string | undefined,
): void {
  const entry = pendingFeedback.get(key);
  if (!entry) return;
  pendingFeedback.delete(key);

  // Files that were never referenced → negative implicit feedback
  const unreferenced = entry.fileIds.filter(fid => !entry.resolvedFileIds.has(fid));
  for (const fid of unreferenced) {
    persistFeedback(userId, fid, 'not_useful', NEGATIVE_MULTIPLIER).catch(() => {});
  }
}

async function persistFeedback(
  userId: string,
  fileId: string,
  rating: 'useful' | 'not_useful',
  _multiplier: number,
): Promise<void> {
  try {
    await db.insert(schema.knowledgeFeedback).values({
      fileId,
      userId,
      rating,
      context: 'implicit',
    });
  } catch {
    // Best-effort — swallow errors
  }
}

// ── Cleanup for tests / graceful shutdown ──────────────────────────────

export function clearAllPending(): void {
  for (const entry of pendingFeedback.values()) {
    clearTimeout(entry.timer);
  }
  pendingFeedback.clear();
}
