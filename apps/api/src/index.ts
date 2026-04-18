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

await app.register(cors, { origin: [config.FRONTEND_URL, 'http://localhost', 'http://localhost:3000', 'https://drivemem.cloud', 'https://drivemem.cloud', 'https://web-indol-omega-43.vercel.app', /\.vercel\.app$/], credentials: true });
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

import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

await app.register(swagger, {
  openapi: {
    info: {
      title: 'AI Drive Open API',
      description: 'AI 知识操作系统 — 让任何 AI agent 接入你的个人知识库',
      version: '1.0.0',
    },
    servers: [{ url: 'https://api.drivemem.cloud' }],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key (ak_xxx)',
          description: 'API Key 认证。在设置页创建 Key。',
        },
      },
    },
    security: [{ apiKey: [] }],
  },
});

await app.register(swaggerUi, {
  routePrefix: '/api/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
});

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

import onboardingRoutes from './routes/onboarding.js';
await app.register(onboardingRoutes, { prefix: '/api/onboarding' });

import adminRoutes from './routes/admin.js';
await app.register(adminRoutes, { prefix: '/api/admin' });

import insightRoutes from './routes/insights.js';
await app.register(insightRoutes, { prefix: '/api/insights' });

import apiKeyRoutes from './routes/api-keys.js';
await app.register(apiKeyRoutes, { prefix: '/api/api-keys' });

import v1Routes from './routes/v1.js';
await app.register(v1Routes, { prefix: '/api/v1' });

import staleContentRoutes from './routes/stale-content.js';
await app.register(staleContentRoutes, { prefix: '/api/v1' });

import workItemRoutes from './routes/work-items.js';
await app.register(workItemRoutes, { prefix: '/api/users/me/work-items' });

import webhookRoutes from './routes/webhooks.js';
await app.register(webhookRoutes, { prefix: '/api/webhooks' });


import inboundRoutes from './routes/inbound.js';
await app.register(inboundRoutes, { prefix: '/api/v1/inbound' });

import mcpHttpRoutes from './routes/mcp-http.js';
await app.register(mcpHttpRoutes, { prefix: '/mcp' });

import integrationRoutes from './routes/integrations.js';
await app.register(integrationRoutes, { prefix: '/api/integrations' });

import timelineRoutes from './routes/timeline.js';
await app.register(timelineRoutes, { prefix: '/api/timeline' });

import resumeBriefRoutes from './routes/resume-brief.js';
await app.register(resumeBriefRoutes, { prefix: '/api/resume-brief' });

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
