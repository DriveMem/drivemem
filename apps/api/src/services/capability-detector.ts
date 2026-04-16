import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';

// --- Types ---

export interface DetectedCapabilities {
  role: string;       // coder | writer | researcher | strategist | general
  domain: string;     // coding | writing | research | strategy | general
  confidence: number; // 0-1
  signals: Signal[];
}

interface Signal {
  source: 'agent-name' | 'headers' | 'behavior' | 'task-text';
  key: string;
  value: string;
  weight: number;
}

interface CacheEntry {
  capabilities: DetectedCapabilities;
  expiresAt: number;
}

// --- Cache: per userId+agentId, 30-min TTL ---
const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function getCacheKey(userId: string, agentId: string): string {
  return `${userId}:${agentId}`;
}

function getCached(userId: string, agentId: string): DetectedCapabilities | null {
  const key = getCacheKey(userId, agentId);
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.capabilities;
  if (entry) cache.delete(key);
  return null;
}

function setCache(userId: string, agentId: string, capabilities: DetectedCapabilities): void {
  cache.set(getCacheKey(userId, agentId), {
    capabilities,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// --- Signal: agent name/description ---

function signalsFromAgentName(agentName?: string): Signal[] {
  if (!agentName) return [];
  const name = agentName.toLowerCase();
  const signals: Signal[] = [];

  const patterns: Array<{ keywords: string[]; role: string; domain: string }> = [
    { keywords: ['code', 'cursor', 'coder', 'dev', 'engineer', 'copilot'], role: 'coder', domain: 'coding' },
    { keywords: ['write', 'writer', 'content', 'draft', 'editor'], role: 'writer', domain: 'writing' },
    { keywords: ['research', 'analyst', 'analyze'], role: 'researcher', domain: 'research' },
    { keywords: ['strateg', 'manager', 'plan', 'lead', 'master'], role: 'strategist', domain: 'strategy' },
  ];

  for (const p of patterns) {
    for (const kw of p.keywords) {
      if (name.includes(kw)) {
        signals.push({ source: 'agent-name', key: 'name-match', value: `${kw} → ${p.role}`, weight: 0.6 });
        break;
      }
    }
  }

  return signals;
}

// --- Signal: request headers ---

export function signalsFromHeaders(headers: Record<string, string | undefined>): Signal[] {
  const signals: Signal[] = [];
  const agentHeader = headers['x-agent-name'] || headers['user-agent'] || '';
  const lower = agentHeader.toLowerCase();

  const headerPatterns: Array<{ keywords: string[]; role: string }> = [
    { keywords: ['code', 'cursor', 'copilot', 'vscode', 'ide'], role: 'coder' },
    { keywords: ['writer', 'notion', 'obsidian', 'content'], role: 'writer' },
    { keywords: ['research', 'perplexity', 'analyst'], role: 'researcher' },
    { keywords: ['manager', 'strategy', 'planner'], role: 'strategist' },
  ];

  for (const p of headerPatterns) {
    for (const kw of p.keywords) {
      if (lower.includes(kw)) {
        signals.push({ source: 'headers', key: 'header-match', value: `${kw} → ${p.role}`, weight: 0.4 });
        break;
      }
    }
  }

  return signals;
}

// --- Signal: behavior analysis (past 24h API calls) ---

async function signalsFromBehavior(userId: string, agentName?: string): Promise<Signal[]> {
  const signals: Signal[] = [];
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const conditions = [
      eq(schema.apiActivityLogs.userId, userId),
      gte(schema.apiActivityLogs.createdAt, since),
    ];
    if (agentName) {
      conditions.push(eq(schema.apiActivityLogs.agentName, agentName));
    }

    const rows = await db.select({
      action: schema.apiActivityLogs.action,
      count: sql<number>`count(*)::int`,
    })
      .from(schema.apiActivityLogs)
      .where(and(...conditions))
      .groupBy(schema.apiActivityLogs.action);

    const counts: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      counts[r.action] = r.count;
      total += r.count;
    }

    if (total < 3) return signals; // Not enough data

    const searchRatio = (counts['search'] || 0) / total;
    const storeRatio = ((counts['store'] || 0) + (counts['upload'] || 0)) / total;
    const compileRatio = (counts['compile'] || 0) / total;

    if (searchRatio > 0.5) {
      signals.push({ source: 'behavior', key: 'search-heavy', value: `${(searchRatio * 100).toFixed(0)}% search`, weight: 0.8 });
    }
    if (storeRatio > 0.4) {
      signals.push({ source: 'behavior', key: 'store-heavy', value: `${(storeRatio * 100).toFixed(0)}% store/upload`, weight: 0.8 });
    }
    if (compileRatio > 0.3) {
      signals.push({ source: 'behavior', key: 'compile-heavy', value: `${(compileRatio * 100).toFixed(0)}% compile`, weight: 0.7 });
    }

    // Check compile task domains from metadata
    const compileRows = await db.select({
      detail: schema.apiActivityLogs.detail,
    })
      .from(schema.apiActivityLogs)
      .where(and(
        eq(schema.apiActivityLogs.userId, userId),
        eq(schema.apiActivityLogs.action, 'compile'),
        gte(schema.apiActivityLogs.createdAt, since),
        ...(agentName ? [eq(schema.apiActivityLogs.agentName, agentName)] : []),
      ))
      .limit(20);

    // Analyze task text from compile requests
    for (const row of compileRows) {
      if (row.detail) {
        const taskSignals = signalsFromTaskText(row.detail);
        for (const s of taskSignals) {
          s.weight *= 0.5; // Reduce weight for historical tasks
        }
        signals.push(...taskSignals);
      }
    }
  } catch (e) {
    console.error('[capability-detector] behavior analysis error:', e);
  }

  return signals;
}

// --- Signal: task text analysis ---

export function signalsFromTaskText(task: string): Signal[] {
  if (!task) return [];
  const signals: Signal[] = [];
  const lower = task.toLowerCase();

  const taskPatterns: Array<{ keywords: string[]; role: string; domain: string }> = [
    { keywords: ['code', 'implement', 'build', 'debug', 'refactor', 'deploy', 'api', 'function', 'class', 'module'], role: 'coder', domain: 'coding' },
    { keywords: ['write', 'draft', 'content', 'blog', 'article', 'copy', 'edit text', 'proofread'], role: 'writer', domain: 'writing' },
    { keywords: ['analyze', 'research', 'investigate', 'compare', 'evaluate', 'study', 'survey'], role: 'researcher', domain: 'research' },
    { keywords: ['plan', 'strategy', 'decide', 'prioritize', 'roadmap', 'architecture', 'design system'], role: 'strategist', domain: 'strategy' },
  ];

  for (const p of taskPatterns) {
    for (const kw of p.keywords) {
      if (lower.includes(kw)) {
        signals.push({ source: 'task-text', key: 'task-keyword', value: `"${kw}" → ${p.role}/${p.domain}`, weight: 0.7 });
        break; // one match per pattern group
      }
    }
  }

  return signals;
}

// --- Aggregation: signals → role + domain ---

function aggregateSignals(signals: Signal[]): DetectedCapabilities {
  if (signals.length === 0) {
    return { role: 'general', domain: 'general', confidence: 0, signals: [] };
  }

  // Tally weighted votes per role
  const roleScores: Record<string, number> = { coder: 0, writer: 0, researcher: 0, strategist: 0, general: 0 };

  const roleFromValue = (value: string): string | null => {
    for (const role of ['coder', 'writer', 'researcher', 'strategist']) {
      if (value.includes(role)) return role;
    }
    return null;
  };

  for (const s of signals) {
    const role = roleFromValue(s.value);
    if (role) {
      roleScores[role] += s.weight;
    }
  }

  // Pick highest-scoring role
  let bestRole = 'general';
  let bestScore = 0;
  for (const [role, score] of Object.entries(roleScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestRole = role;
    }
  }

  // Map role → domain
  const roleToDomain: Record<string, string> = {
    coder: 'coding',
    writer: 'writing',
    researcher: 'research',
    strategist: 'strategy',
    general: 'general',
  };

  // Confidence: normalize best score vs total possible
  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  const confidence = totalWeight > 0 ? Math.min(bestScore / totalWeight, 1) : 0;

  return {
    role: bestRole,
    domain: roleToDomain[bestRole] || 'general',
    confidence: Math.round(confidence * 100) / 100,
    signals,
  };
}

// --- Main entry point ---

export async function detectCapabilities(
  userId: string,
  options: {
    agentName?: string;
    headers?: Record<string, string | undefined>;
    taskText?: string;
  } = {},
): Promise<DetectedCapabilities> {
  const agentId = options.agentName || 'anonymous';

  // Check cache
  const cached = getCached(userId, agentId);
  if (cached) return cached;

  // Collect signals from all sources
  const signals: Signal[] = [];

  // 1. Agent name
  signals.push(...signalsFromAgentName(options.agentName));

  // 2. Headers
  if (options.headers) {
    signals.push(...signalsFromHeaders(options.headers));
  }

  // 3. Behavior (async DB query)
  const behaviorSignals = await signalsFromBehavior(userId, options.agentName);
  signals.push(...behaviorSignals);

  // 4. Task text
  if (options.taskText) {
    signals.push(...signalsFromTaskText(options.taskText));
  }

  // Aggregate
  const capabilities = aggregateSignals(signals);

  // Cache result
  setCache(userId, agentId, capabilities);

  return capabilities;
}

// --- Invalidate cache (e.g., when new activity is logged) ---

export function invalidateCapabilityCache(userId: string, agentName?: string): void {
  const agentId = agentName || 'anonymous';
  cache.delete(getCacheKey(userId, agentId));
}
