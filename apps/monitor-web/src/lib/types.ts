export interface Agent {
  id: string;
  name: string;
  emoji: string;
  status: 'online' | 'busy' | 'offline' | 'unknown';
  lastHeartbeat: string;
  tasks: { queue: number; active: number; blocked: number; done: number };
  currentTask?: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'queue' | 'active' | 'blocked' | 'done';
  created_at: string;
  updated_at: string;
  checkpoint?: string;
}

export interface MemoryEntry {
  agent: string;
  filename: string;
  date: string;
  content?: string;
}
