import {
  AGENTS,
  AGENT_IDS,
  type AgentId,
  type AgentStatus,
  type AgentOverview,
  type AgentsResponse,
  type AgentDetailResponse,
  type TaskStatus,
} from '@ai-drive/shared-types';
import type { Env } from '../types.js';
import { listTaskFiles } from './r2.js';
import { getHeartbeat } from './kv.js';

const TASK_STATUSES: TaskStatus[] = ['queue', 'active', 'blocked', 'done'];

function getAgentStatus(lastHeartbeat: string | null, activeTasks: number): AgentStatus {
  if (!lastHeartbeat) return 'unknown';
  const minutesSince = (Date.now() - new Date(lastHeartbeat).getTime()) / 60000;
  if (minutesSince > 5) return 'offline';
  if (activeTasks > 0) return 'busy';
  return 'online';
}

export async function getAgentOverview(env: Env, agentId: AgentId): Promise<AgentOverview> {
  const config = AGENTS.find((a) => a.id === agentId)!;
  const heartbeat = await getHeartbeat(env.MONITOR_HEARTBEAT, agentId);

  const taskCounts: Record<TaskStatus, number> = { queue: 0, active: 0, blocked: 0, done: 0 };
  await Promise.all(
    TASK_STATUSES.map(async (status) => {
      const tasks = await listTaskFiles(env.MONITOR_DATA, agentId, status);
      taskCounts[status] = tasks.length;
    })
  );

  return {
    id: agentId,
    name: config.name,
    emoji: config.emoji,
    status: getAgentStatus(heartbeat?.timestamp ?? null, taskCounts.active),
    lastHeartbeat: heartbeat?.timestamp ?? null,
    tasks: taskCounts,
    currentTask: heartbeat?.currentTask ?? null,
  };
}

export async function getAllAgents(env: Env): Promise<AgentsResponse> {
  const agents = await Promise.all(AGENT_IDS.map((id) => getAgentOverview(env, id)));
  return { agents, updatedAt: new Date().toISOString() };
}

export async function getAgentDetail(env: Env, agentId: AgentId): Promise<AgentDetailResponse | null> {
  const config = AGENTS.find((a) => a.id === agentId);
  if (!config) return null;

  const heartbeat = await getHeartbeat(env.MONITOR_HEARTBEAT, agentId);
  const [active, blocked, queue, done] = await Promise.all([
    listTaskFiles(env.MONITOR_DATA, agentId, 'active'),
    listTaskFiles(env.MONITOR_DATA, agentId, 'blocked'),
    listTaskFiles(env.MONITOR_DATA, agentId, 'queue'),
    listTaskFiles(env.MONITOR_DATA, agentId, 'done'),
  ]);

  return {
    agent: config,
    status: getAgentStatus(heartbeat?.timestamp ?? null, active.length),
    lastHeartbeat: heartbeat?.timestamp ?? null,
    tasks: { active, blocked, queue, done },
  };
}
