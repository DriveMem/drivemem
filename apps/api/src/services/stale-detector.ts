/**
 * Stale Content Detection — detect outdated knowledge and assign staleScore.
 */

import { db } from '../db/index.js';
import { files, knowledgeFeedback } from '../db/schema.js';
import { eq, and, sql, lt, isNull } from 'drizzle-orm';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface StaleFile {
  fileId: string;
  fileName: string;
  reason: 'inactive' | 'outdated_language' | 'negative_feedback';
  lastAccessedAt: Date | null;
  staleSince: Date;
  staleScore: number;
}

// Temporal language patterns that suggest content may be outdated
const OUTDATED_PATTERNS = [
  /\bwill be\b/i,
  /\bplan to\b/i,
  /\bnext week\b/i,
  /\btomorrow\b/i,
  /\bupcoming\b/i,
  /\bgoing to\b/i,
  /\bby end of\b/i,
  /\bscheduled for\b/i,
  /\bexpected to\b/i,
  /\bin the coming\b/i,
  /\b下周\b/,
  /\b明天\b/,
  /\b计划\b/,
  /\b即将\b/,
  /\b预计\b/,
];

/**
 * Detect stale content for a user. Returns files that may be outdated.
 */
export async function detectStaleContent(userId: string): Promise<StaleFile[]> {
  const now = Date.now();
  const ninetyDaysAgo = new Date(now - 90 * DAY_MS);
  const thirtyDaysAgo = new Date(now - 30 * DAY_MS);
  const staleFiles: StaleFile[] = [];

  // Get all non-archived, non-deleted files for this user
  const userFiles = await db.select({
    id: files.id,
    name: files.name,
    summary: files.summary,
    lastAccessedAt: files.lastAccessedAt,
    updatedAt: files.updatedAt,
    createdAt: files.createdAt,
  })
    .from(files)
    .where(and(
      eq(files.userId, userId),
      isNull(files.archivedAt),
      isNull(files.deletedAt),
      eq(files.status, 'indexed'),
    ));

  // Get negative feedback counts per file
  const feedbackRows = await db.select({
    fileId: knowledgeFeedback.fileId,
    negCount: sql<number>`count(*) filter (where ${knowledgeFeedback.rating} = 'not_useful')`,
  })
    .from(knowledgeFeedback)
    .where(eq(knowledgeFeedback.userId, userId))
    .groupBy(knowledgeFeedback.fileId);

  const negFeedbackMap = new Map<string, number>();
  for (const row of feedbackRows) {
    negFeedbackMap.set(row.fileId, Number(row.negCount));
  }

  for (const file of userFiles) {
    const accessDate = file.lastAccessedAt ?? file.updatedAt;
    let reason: StaleFile['reason'] | null = null;
    let score = 0;

    // Check 1: Inactive — not accessed in 90+ days
    if (accessDate < ninetyDaysAgo) {
      reason = 'inactive';
      const daysSinceAccess = (now - accessDate.getTime()) / DAY_MS;
      // Score: 0.5 at 90 days, scaling to 1.0 at 365 days
      score = Math.max(score, Math.min(1.0, 0.5 + (daysSinceAccess - 90) / 550));
    }

    // Check 2: Outdated language in summary + file is old enough (30+ days)
    if (file.summary && file.createdAt < thirtyDaysAgo) {
      const hasOutdatedLang = OUTDATED_PATTERNS.some(p => p.test(file.summary!));
      if (hasOutdatedLang) {
        if (!reason) reason = 'outdated_language';
        score = Math.max(score, 0.6);
      }
    }

    // Check 3: Negative feedback — 3+ not_useful ratings
    const negCount = negFeedbackMap.get(file.id) ?? 0;
    if (negCount >= 3) {
      if (!reason) reason = 'negative_feedback';
      score = Math.max(score, Math.min(1.0, 0.5 + negCount * 0.1));
    }

    if (reason && score > 0) {
      staleFiles.push({
        fileId: file.id,
        fileName: file.name,
        reason,
        lastAccessedAt: file.lastAccessedAt,
        staleSince: accessDate,
        staleScore: Math.round(score * 100) / 100,
      });
    }
  }

  return staleFiles.sort((a, b) => b.staleScore - a.staleScore);
}

/**
 * Compute staleScore for a single file. Returns 0–1.
 */
export function computeStaleScore(
  lastAccessedAt: Date | null,
  updatedAt: Date,
  createdAt: Date,
  summary: string | null,
  negativeFeedbackCount: number,
): number {
  const now = Date.now();
  const ninetyDaysAgo = new Date(now - 90 * DAY_MS);
  const thirtyDaysAgo = new Date(now - 30 * DAY_MS);
  const accessDate = lastAccessedAt ?? updatedAt;
  let score = 0;

  // Inactive
  if (accessDate < ninetyDaysAgo) {
    const daysSinceAccess = (now - accessDate.getTime()) / DAY_MS;
    score = Math.max(score, Math.min(1.0, 0.5 + (daysSinceAccess - 90) / 550));
  }

  // Outdated language
  if (summary && createdAt < thirtyDaysAgo) {
    if (OUTDATED_PATTERNS.some(p => p.test(summary))) {
      score = Math.max(score, 0.6);
    }
  }

  // Negative feedback
  if (negativeFeedbackCount >= 3) {
    score = Math.max(score, Math.min(1.0, 0.5 + negativeFeedbackCount * 0.1));
  }

  return Math.round(score * 100) / 100;
}
