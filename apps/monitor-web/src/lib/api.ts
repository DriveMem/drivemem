import type { Agent, Task, MemoryEntry } from './types';
import { mockAgents, mockTasks, mockMemoryEntries } from './mock';

const API_BASE = 'https://monitor-worker.ai-drive-monitor.workers.dev/api';
const USE_MOCK = false;

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
  const data = await res.json();
  // API returns { agent: { id, name, emoji }, status, lastHeartbeat, tasks: { active: [], ... }, currentTask }
  // Map to flat Agent type
  const agent = data.agent ?? data;
  const tasks = data.tasks ?? {};
  return {
    id: agent.id ?? id,
    name: agent.name ?? id,
    emoji: agent.emoji ?? '🤖',
    status: data.status ?? 'unknown',
    lastHeartbeat: data.lastHeartbeat ?? '',
    tasks: {
      queue: Array.isArray(tasks.queue) ? tasks.queue.length : (tasks.queue ?? 0),
      active: Array.isArray(tasks.active) ? tasks.active.length : (tasks.active ?? 0),
      blocked: Array.isArray(tasks.blocked) ? tasks.blocked.length : (tasks.blocked ?? 0),
      done: Array.isArray(tasks.done) ? tasks.done.length : (tasks.done ?? 0),
    },
    currentTask: data.currentTask,
  };
}

export async function fetchAgentTasks(id: string, status?: string): Promise<Task[]> {
  if (USE_MOCK) {
    const tasks = mockTasks[id] ?? [];
    return status ? tasks.filter(t => t.status === status) : tasks;
  }
  if (!status) {
    // No status: API returns { tasks: { queue: [], active: [], blocked: [], done: [] } }
    const res = await fetch(`${API_BASE}/agents/${id}/tasks`);
    if (!res.ok) return [];
    const data = await res.json();
    const grouped = data.tasks ?? {};
    const all: Task[] = [];
    for (const [s, items] of Object.entries(grouped)) {
      if (Array.isArray(items)) {
        for (const item of items) {
          all.push({ ...item, status: (item as any).status ?? s });
        }
      }
    }
    return all;
  }
  // With status: API returns { tasks: [...] }
  const res = await fetch(`${API_BASE}/agents/${id}/tasks?status=${status}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.tasks) ? data.tasks : [];
}

export async function fetchMemory(date: string, agent?: string): Promise<MemoryEntry[]> {
  if (USE_MOCK) {
    const entries = mockMemoryEntries[date] ?? [];
    return agent ? entries.filter(e => e.agent === agent) : entries;
  }
  const params = new URLSearchParams({ date });
  if (agent) params.set('agent', agent);
  const res = await fetch(`${API_BASE}/memory?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch memory: ${res.status}`);
  const data = await res.json();
  const entries = Array.isArray(data) ? data : (data.entries ?? []);
  return agent ? entries.filter((e: MemoryEntry) => e.agent === agent) : entries;
}

export async function fetchMemoryContent(agent: string, filename: string): Promise<string> {
  if (USE_MOCK) {
    for (const entries of Object.values(mockMemoryEntries)) {
      const entry = entries.find(e => e.agent === agent && e.filename === filename);
      if (entry?.content) return entry.content;
    }
    return '';
  }
  const res = await fetch(`${API_BASE}/memory/${agent}/${filename}`);
  if (!res.ok) throw new Error(`Failed to fetch memory content: ${res.status}`);
  const data = await res.json();
  return data.content ?? '';
}
