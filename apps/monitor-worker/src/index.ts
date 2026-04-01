import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types.js';
import agents from './routes/agents.js';
import memory from './routes/memory.js';
import health from './routes/health.js';

const app = new Hono<{ Bindings: Env }>();

app.use(
  '/api/*',
  cors({
    origin: (origin) => {
      if (!origin) return '*';
      if (origin.endsWith('.vrrrnm.cloud') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return origin;
      }
      return '';
    },
  })
);

app.route('/api/agents', agents);
app.route('/api/memory', memory);
app.route('/api/health', health);

app.all('*', (c) => c.json({ error: 'Not found' }, 404));

export default app;
