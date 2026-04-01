// Agent configuration
export const AGENT_IDS = ['main', 'ad-manager', 'ad-master', 'ad-frontend', 'ad-backend', 'ad-tester', 'ad-operator'] as const;
export type AgentId = typeof AGENT_IDS[number];

export interface AgentConfig {
  id: AgentId;
  name: string;
  emoji: string;
}

export type AgentStatus = 'online' | 'busy' | 'offline' | 'unknown';

export const AGENTS: readonly AgentConfig[] = [
  { id: 'main',        name: '辛秘书',             emoji: '🐂' },
  { id: 'ad-manager',  name: 'AD Manager',        emoji: '📋' },
  { id: 'ad-master',   name: 'AD Master',         emoji: '🧭' },
  { id: 'ad-frontend', name: 'AD Frontend Coder', emoji: '🎨' },
  { id: 'ad-backend',  name: 'AD Backend Coder',  emoji: '⚙️' },
  { id: 'ad-tester',   name: 'AD Tester',         emoji: '🧪' },
  { id: 'ad-operator', name: 'AD Operator',       emoji: '🚀' },
] as const;

// Task types
export type TaskStatus = 'queue' | 'active' | 'blocked' | 'done';

export interface TaskCheckpoint {
  step: number;
  description: string;
  files_touched: string[];
  last_update: string | null;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: string;
  created_at: string;
  updated_at: string;
  from_agent: string;
  to_agent: string;
  upstream_input: string;
  expected_output: string;
  dependencies: string[];
  checkpoint: TaskCheckpoint;
  notes: string;
}

// Heartbeat
export interface Heartbeat {
  timestamp: string;
  status: string;
  currentTask: string | null;
}

// Memory
export interface MemoryEntry {
  agent: AgentId;
  filename: string;
  date: string;
  content: string;
}

export interface MemoryListItem {
  agent: AgentId;
  filename: string;
  date: string;
}

// API Responses
export interface AgentOverview {
  id: AgentId;
  name: string;
  emoji: string;
  status: AgentStatus;
  lastHeartbeat: string | null;
  tasks: Record<TaskStatus, number>;
  currentTask: string | null;
}

export interface AgentsResponse {
  agents: AgentOverview[];
  updatedAt: string;
}

export interface AgentDetailResponse {
  agent: AgentConfig;
  status: AgentStatus;
  lastHeartbeat: string | null;
  tasks: {
    active: Task[];
    blocked: Task[];
    queue: Task[];
    done: Task[];
  };
}

export interface MemoryListResponse {
  date: string;
  entries: MemoryListItem[];
}

export interface MemoryContentResponse {
  agent: AgentId;
  filename: string;
  date: string;
  content: string;
}

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
}
