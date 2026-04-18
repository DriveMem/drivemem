import type { AgentProfile } from './types.js';

// Structured agent profile from DB
export interface DbAgentProfile {
  id: string;
  role: string | null;
  domain: string | null;
  capabilities: { canSearch?: boolean; canStore?: boolean; canCompile?: boolean; canAsk?: boolean } | null;
  preferences: { preferredFormat?: string; maxTokenBudget?: number; language?: string } | null;
  contextRules: { projectFilter?: string[]; tagFilter?: string[]; excludeTags?: string[]; recencyBias?: string } | null;
  contextBudget: number | null;
  name: string;
}

// Role-based content routing boosts
export const ROLE_BOOSTS: Record<string, Record<string, number>> = {
  coder: { engineering: 1.5, decision: 1.3, fact: 1.2, analysis: 1.0, preference: 0.8, 'action-item': 1.0 },
  writer: { preference: 1.5, analysis: 1.3, decision: 1.2, fact: 1.0, engineering: 0.7, 'action-item': 0.8 },
  researcher: { analysis: 1.5, fact: 1.4, engineering: 1.2, decision: 1.1, preference: 0.9, 'action-item': 0.8 },
  strategist: { decision: 1.5, analysis: 1.4, fact: 1.2, 'action-item': 1.3, engineering: 0.9, preference: 1.0 },
  general: {}, // no boosts, use base scores
};

export function inferRole(agentName?: string): string {
  if (!agentName) return 'general';
  const name = agentName.toLowerCase();
  if (name.includes('code') || name.includes('cursor') || name.includes('coder') || name.includes('dev')) return 'coder';
  if (name.includes('write') || name.includes('writer') || name.includes('content')) return 'writer';
  if (name.includes('research') || name.includes('analyst')) return 'researcher';
  if (name.includes('strateg') || name.includes('manager') || name.includes('plan')) return 'strategist';
  return 'general';
}

/**
 * Look up a structured agent profile by API key ID from the database.
 * Returns null if no profile is bound to this API key.
 */
export async function getProfileByApiKeyId(userId: string, apiKeyId: string): Promise<DbAgentProfile | null> {
  try {
    const { db } = await import('../../db/index.js');
    const { agentProfiles } = await import('../../db/schema.js');
    const { eq, and } = await import('drizzle-orm');

    const [profile] = await db.select({
      id: agentProfiles.id,
      name: agentProfiles.name,
      role: agentProfiles.role,
      domain: agentProfiles.domain,
      capabilities: agentProfiles.capabilities,
      preferences: agentProfiles.preferences,
      contextRules: agentProfiles.contextRules,
      contextBudget: agentProfiles.contextBudget,
    })
      .from(agentProfiles)
      .where(and(
        eq(agentProfiles.userId, userId),
        eq(agentProfiles.apiKeyId, apiKeyId),
        eq(agentProfiles.isActive, true),
      ))
      .limit(1);

    if (!profile) return null;
    return profile as DbAgentProfile;
  } catch {
    return null;
  }
}

// Agent Profile Registry — modular, pluggable
const profiles: Map<string, AgentProfile> = new Map();

// Register default profiles
profiles.set('default', {
  id: 'default', name: 'Default', contextWindow: 128000,
  preferredFormat: 'markdown', maxFragments: 30, priorityRules: ['relevance'],
  domain: 'general',
});
profiles.set('claude-opus', {
  id: 'claude-opus', name: 'Claude Opus', contextWindow: 200000,
  preferredFormat: 'markdown', maxFragments: 40, priorityRules: ['relevance', 'recency'],
  domain: 'general',
});
profiles.set('claude-sonnet', {
  id: 'claude-sonnet', name: 'Claude Sonnet', contextWindow: 200000,
  preferredFormat: 'markdown', maxFragments: 30, priorityRules: ['relevance'],
  domain: 'general',
});
profiles.set('gpt-4o', {
  id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000,
  preferredFormat: 'markdown', maxFragments: 25, priorityRules: ['relevance'],
  domain: 'general',
});
profiles.set('gpt-4o-mini', {
  id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000,
  preferredFormat: 'markdown', maxFragments: 20, priorityRules: ['relevance', 'brevity'],
  domain: 'general',
});

export function resolveProfile(modelName?: string): AgentProfile {
  if (!modelName) return profiles.get('default')!;
  // Try exact match first, then prefix match
  const exact = profiles.get(modelName);
  if (exact) return exact;
  for (const [key, profile] of profiles) {
    if (modelName.toLowerCase().includes(key)) return profile;
  }
  return profiles.get('default')!;
}

export function registerProfile(profile: AgentProfile): void {
  profiles.set(profile.id, profile);
}

export function listProfiles(): AgentProfile[] {
  return Array.from(profiles.values());
}
