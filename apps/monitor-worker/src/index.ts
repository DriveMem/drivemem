import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types.js';
import agents from './routes/agents.js';
import memory from './routes/memory.js';
import health from './routes/health.js';
import { cacheMiddleware } from './middleware/cache.js';

const app = new Hono<{ Bindings: Env }>();

app.use(
  '/api/*',
  cors({
    origin: (origin) => {
      if (!origin) return '*';
      if (origin.endsWith('.verrrnm.cloud') || origin === 'https://verrrnm.cloud' || origin.endsWith('.drivemem.cloud') || origin === 'https://drivemem.cloud' || origin.endsWith('.vrrrnm.cloud') || origin === 'https://vrrrnm.cloud' || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('pages.dev')) {
        return origin;
      }
      return '';
    },
  })
);

// Cache API for high-frequency endpoints (TTL 30s, aligned with frontend polling)
app.use('/api/agents/*', cacheMiddleware(30));
app.use('/api/agents', cacheMiddleware(30));
app.use('/api/memory/*', cacheMiddleware(30));
app.use('/api/memory', cacheMiddleware(30));
app.use('/api/health', cacheMiddleware(60));

app.route('/api/agents', agents);
app.route('/api/memory', memory);
app.route('/api/health', health);

app.all('*', (c) => c.json({ error: 'Not found' }, 404));

export default app;
