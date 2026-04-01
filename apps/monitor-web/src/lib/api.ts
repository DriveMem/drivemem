import type { Agent, Task, MemoryEntry } from './types';
import { mockAgents } from './mock';

const API_BASE = '/api';
const USE_MOCK = true; // TODO: 切换为 false 或用环境变量控制

export async function fetchAgents(): Promise<Agent[]> {
  if (USE_MOCK) return mockAgents;
  const res = await fetch(`${API_BASE}/agents`);
  if (!res.ok) throw new Error(`Failed to fetch agents: ${res.status}`);
  const data = await res.json();
  return data.agents;
}

export async function fetchAgent(id: string): Promise<Agent | null> {
  if (USE_MOCK) return mockAgents.find(a => a.id === id) ?? null;
  const res = await fetch(`${API_BASE}/agents/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchAgentTasks(id: string, status?: string): Promise<Task[]> {
  if (USE_MOCK) return []; // TODO: mock tasks
  const params = status ? `?status=${status}` : '';
  const res = await fetch(`${API_BASE}/agents/${id}/tasks${params}`);
  if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
  return res.json();
}

export async function fetchMemory(date: string, agent?: string): Promise<MemoryEntry[]> {
  if (USE_MOCK) return []; // TODO: mock memory
  const params = new URLSearchParams({ date });
  if (agent) params.set('agent', agent);
  const res = await fetch(`${API_BASE}/memory?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch memory: ${res.status}`);
  return res.json();
}
