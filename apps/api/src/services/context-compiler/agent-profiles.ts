import type { AgentProfile } from './types.js';

// Agent Profile Registry — modular, pluggable
const profiles: Map<string, AgentProfile> = new Map();

// Register default profiles
profiles.set('default', {
  id: 'default', name: 'Default', contextWindow: 128000,
  preferredFormat: 'markdown', maxFragments: 30, priorityRules: ['relevance'],
});
profiles.set('claude-opus', {
  id: 'claude-opus', name: 'Claude Opus', contextWindow: 200000,
  preferredFormat: 'markdown', maxFragments: 40, priorityRules: ['relevance', 'recency'],
});
profiles.set('claude-sonnet', {
  id: 'claude-sonnet', name: 'Claude Sonnet', contextWindow: 200000,
  preferredFormat: 'markdown', maxFragments: 30, priorityRules: ['relevance'],
});
profiles.set('gpt-4o', {
  id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000,
  preferredFormat: 'markdown', maxFragments: 25, priorityRules: ['relevance'],
});
profiles.set('gpt-4o-mini', {
  id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000,
  preferredFormat: 'markdown', maxFragments: 20, priorityRules: ['relevance', 'brevity'],
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
