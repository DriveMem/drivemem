import { Hono } from 'hono';
import { AGENT_IDS, type AgentId } from '@ai-drive/shared-types';
import type { Env } from '../types.js';
import { getMemoryList, getMemoryContent } from '../services/r2.js';
import type { MemoryListResponse, MemoryContentResponse } from '@ai-drive/shared-types';

const memory = new Hono<{ Bindings: Env }>();

const VALID_IDS = new Set<string>(AGENT_IDS);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

memory.get('/', async (c) => {
  const date = c.req.query('date');
  if (!date || !DATE_RE.test(date)) {
    return c.json({ error: 'Invalid or missing date parameter (YYYY-MM-DD)' }, 400);
  }
  const agent = c.req.query('agent');
  const agentIds = agent && VALID_IDS.has(agent) ? [agent as AgentId] : [...AGENT_IDS];
  const allEntries = (
    await Promise.all(agentIds.map((id) => getMemoryList(c.env.MONITOR_DATA, id, date)))
  ).flat();
  const res: MemoryListResponse = { date, entries: allEntries };
  return c.json(res);
});

memory.get('/:agent/:filename', async (c) => {
  const agent = c.req.param('agent');
  const filename = c.req.param('filename');
  if (!VALID_IDS.has(agent)) return c.json({ error: 'Invalid agent ID' }, 400);
  const content = await getMemoryContent(c.env.MONITOR_DATA, agent, filename);
  if (content === null) return c.json({ error: 'Memory not found' }, 404);
  const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  const res: MemoryContentResponse = {
    agent: agent as AgentId,
    filename,
    date: dateMatch ? dateMatch[1] : '',
    content,
  };
  return c.json(res);
});

export default memory;
