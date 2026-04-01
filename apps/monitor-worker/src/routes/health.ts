import { Hono } from 'hono';
import type { Env } from '../types.js';
import type { HealthResponse } from '@ai-drive/shared-types';

const health = new Hono<{ Bindings: Env }>();

health.get('/', (c) => {
  const res: HealthResponse = { status: 'ok', timestamp: new Date().toISOString() };
  return c.json(res);
});

export default health;
