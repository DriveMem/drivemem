import type { Agent, MemoryEntry } from './types';

const API_BASE = '/api';

export async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch(`${API_BASE}/agents`);
  return res.json();
}

export async function fetchAgent(id: string): Promise<Agent> {
  const res = await fetch(`${API_BASE}/agents/${id}`);
  return res.json();
}

export async function fetchMemory(date: string, agent?: string): Promise<MemoryEntry[]> {
  const params = new URLSearchParams({ date });
  if (agent) params.set('agent', agent);
  const res = await fetch(`${API_BASE}/memory?${params}`);
  return res.json();
}
