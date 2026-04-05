import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import errorHandler from './plugins/error-handler.js';
import { config } from './lib/config.js';

const app = Fastify({
  logger: {
    level: 'info',
    ...(config.NODE_ENV === 'development' && {
      transport: { target: 'pino-pretty', options: { colorize: true } },
    }),
  },
});

// Allow empty body with application/json content-type (e.g. DELETE requests from browsers)
app.addHook('onRequest', async (request) => {
  if (request.method === 'DELETE') {
    const ct = request.headers['content-type'];
    if (ct) {
      // Browser fetch sends content-type without body on DELETE — strip it
      const cl = request.headers['content-length'];
      if (!cl || cl === '0') {
        delete request.headers['content-type'];
      }
    }
  }
});

await app.register(cors, { origin: [config.FRONTEND_URL, 'http://localhost', 'http://localhost:3000', 'https://drive.verrrnm.cloud', 'https://verrrnm.cloud', 'https://web-indol-omega-43.vercel.app', /\.vercel\.app$/], credentials: true });
await app.register(sensible);

// Rate limiting — 100 req/min per IP, stricter for auth endpoints
import rateLimit from '@fastify/rate-limit';
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (request) => request.ip,
});

import multipart from '@fastify/multipart';
await app.register(multipart, { limits: { fileSize: 52428800 } }); // 50MB

await app.register(errorHandler);

import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import fileRoutes from './routes/files.js';
import trashRoutes from './routes/trash.js';
import folderRoutes from './routes/folders.js';
import conversationRoutes from './routes/conversations.js';
import searchRoutes from './routes/search.js';
import exportRoutes from './routes/export.js';
import clipRoutes from './routes/clips.js';
import sharesRoutes from './routes/shares.js';
import reportsRoutes from './routes/reports.js';
import notificationRoutes from './routes/notifications.js';

import demoGuard from './plugins/demo-guard.js';

await app.register(authPlugin);
await app.register(demoGuard);
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(userRoutes, { prefix: '/api/users' });
await app.register(fileRoutes, { prefix: '/api/files' });
await app.register(trashRoutes, { prefix: '/api/trash' });
await app.register(folderRoutes, { prefix: '/api/folders' });
await app.register(conversationRoutes, { prefix: '/api/conversations' });
await app.register(searchRoutes, { prefix: '/api/search' });
await app.register(exportRoutes, { prefix: '/api/users/me' });
await app.register(clipRoutes, { prefix: '/api/clips' });
await app.register(sharesRoutes, { prefix: '/api' });
await app.register(reportsRoutes, { prefix: '/api/reports' });
await app.register(notificationRoutes, { prefix: '/api/notifications' });

import tagRoutes from './routes/tags.js';
await app.register(tagRoutes, { prefix: '/api/tags' });

import feedbackRoutes from './routes/feedback.js';
await app.register(feedbackRoutes, { prefix: '/api/feedback' });

import adminRoutes from './routes/admin.js';
await app.register(adminRoutes, { prefix: '/api/admin' });

// Health check endpoint
app.get('/api/health', async (_request, reply) => {
  return reply.send({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
