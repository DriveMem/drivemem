import { Hono } from 'hono';
import { AGENT_IDS, type AgentId, type TaskStatus } from '@ai-drive/shared-types';
import type { Env } from '../types.js';
import { getAllAgents, getAgentDetail } from '../services/agents.js';
import { listTaskFiles } from '../services/r2.js';

const agents = new Hono<{ Bindings: Env }>();

const VALID_IDS = new Set<string>(AGENT_IDS);
const VALID_STATUSES = new Set<string>(['queue', 'active', 'blocked', 'done']);

agents.get('/', async (c) => {
  const data = await getAllAgents(c.env);
  return c.json(data);
});

agents.get('/:id', async (c) => {
  const id = c.req.param('id');
  if (!VALID_IDS.has(id)) return c.json({ error: 'Invalid agent ID' }, 400);
  const detail = await getAgentDetail(c.env, id as AgentId);
  if (!detail) return c.json({ error: 'Agent not found' }, 404);
  return c.json(detail);
});

agents.get('/:id/tasks', async (c) => {
  const id = c.req.param('id');
  if (!VALID_IDS.has(id)) return c.json({ error: 'Invalid agent ID' }, 400);
  const status = c.req.query('status');
  if (status && !VALID_STATUSES.has(status)) {
    return c.json({ error: 'Invalid status parameter' }, 400);
  }
  if (status) {
    const tasks = await listTaskFiles(c.env.MONITOR_DATA, id, status as TaskStatus);
    return c.json({ tasks });
  }
  // No status filter: return all statuses
  const [queue, active, blocked, done] = await Promise.all([
    listTaskFiles(c.env.MONITOR_DATA, id, 'queue'),
    listTaskFiles(c.env.MONITOR_DATA, id, 'active'),
    listTaskFiles(c.env.MONITOR_DATA, id, 'blocked'),
    listTaskFiles(c.env.MONITOR_DATA, id, 'done'),
  ]);
  return c.json({ tasks: { queue, active, blocked, done } });
});

export default agents;
