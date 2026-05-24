import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import errorHandler from './plugins/error-handler.js';
import { config } from './lib/config.js';
import { db } from './db/index.js';
import * as schema from './db/schema.js';
import { maybeAutoTune } from './services/model-profile-tuner.js';

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
import searchFeedbackRoutes from './routes/search-feedback.js';
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
await app.register(searchFeedbackRoutes, { prefix: '/api/search' });
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
import citationStatsRoutes from './routes/citation-stats.js';
import knowledgeGapRoutes from './routes/knowledge-gaps.js';
await app.register(insightRoutes, { prefix: '/api/insights' });
await app.register(citationStatsRoutes, { prefix: '/api/citations' });
await app.register(knowledgeGapRoutes, { prefix: '/api/knowledge-gaps' });

import apiKeyRoutes from './routes/api-keys.js';
await app.register(apiKeyRoutes, { prefix: '/api/api-keys' });

import v1Routes from './routes/v1.js';
await app.register(v1Routes, { prefix: '/api/v1' });

import handoffRoutes from './routes/handoffs.js';
await app.register(handoffRoutes, { prefix: '/api/handoffs' });

// Public endpoints (no auth)
await app.register(async function publicRoutes(pub) {
  pub.get('/model-profiles', async (request, reply) => {
    // Static profiles
    const profiles: Record<string, any> = {
      'claude-opus-4': { tokenBudget: 3000, threshold: 0.65, mode: 'full' },
      'claude-sonnet-4': { tokenBudget: 2000, threshold: 0.68, mode: 'full' },
      'claude-haiku-3.5': { tokenBudget: 1000, threshold: 0.72, mode: 'summary' },
      'claude-3-5-sonnet': { tokenBudget: 2000, threshold: 0.65, mode: 'full' },
      'o3': { tokenBudget: 800, threshold: 0.82, mode: 'key_facts' },
      'o4-mini': { tokenBudget: 600, threshold: 0.82, mode: 'key_facts' },
      'o1': { tokenBudget: 800, threshold: 0.82, mode: 'key_facts' },
      'gpt-4.1': { tokenBudget: 3000, threshold: 0.65, mode: 'full' },
      'gpt-4.1-mini': { tokenBudget: 1500, threshold: 0.70, mode: 'summary' },
      'gpt-4o': { tokenBudget: 2000, threshold: 0.65, mode: 'full' },
      'gpt-4o-mini': { tokenBudget: 800, threshold: 0.72, mode: 'summary' },
      'gpt-3.5-turbo': { tokenBudget: 300, threshold: 0.75, mode: 'summary' },
      'deepseek-v3.2': { tokenBudget: 2000, threshold: 0.65, mode: 'full' },
      'deepseek-r1': { tokenBudget: 600, threshold: 0.82, mode: 'key_facts' },
      'deepseek-r1-distill': { tokenBudget: 300, threshold: 0.85, mode: 'key_facts' },
      'deepseek-coder': { tokenBudget: 2000, threshold: 0.70, mode: 'code_first' },
      'qwen3-max': { tokenBudget: 2000, threshold: 0.65, mode: 'full' },
      'qwen3-plus': { tokenBudget: 1500, threshold: 0.68, mode: 'summary' },
      'qwen3-flash': { tokenBudget: 800, threshold: 0.72, mode: 'summary' },
      'qwen-coder-plus': { tokenBudget: 2000, threshold: 0.70, mode: 'code_first' },
      'qwq-plus': { tokenBudget: 600, threshold: 0.82, mode: 'key_facts' },
      'kimi-k2.5': { tokenBudget: 2000, threshold: 0.65, mode: 'full' },
      'minimax-m2.7': { tokenBudget: 3000, threshold: 0.63, mode: 'full' },
      '_default': { tokenBudget: 800, threshold: 0.75, mode: 'summary' },
    };

    // Merge data-driven overrides on top of static profiles
    try {
      const overrides = await db.select().from(schema.modelProfileOverrides);
      for (const o of overrides) {
        if (o.sampleCount && o.sampleCount >= 10) {
          const existing = profiles[o.modelName] || profiles['_default'];
          profiles[o.modelName] = {
            ...existing,
            tokenBudget: o.optimalContextTokens || existing.tokenBudget,
            dataPoints: o.sampleCount,
            successRate: o.successRate,
          };
        }
      }
    } catch (_e) { /* table may not exist yet */ }

    reply.header('Cache-Control', 'public, max-age=86400');
    return reply.send({ profiles, version: '2026-04-23', count: Object.keys(profiles).length });
  });
}, { prefix: '/api/v1' });

import quickPromptRoutes from './routes/quick-prompts.js';
await app.register(quickPromptRoutes, { prefix: '/api/quick-prompts' });

import staleContentRoutes from './routes/stale-content.js';
await app.register(staleContentRoutes, { prefix: '/api/v1' });

import workItemRoutes from './routes/work-items.js';
await app.register(workItemRoutes, { prefix: '/api/users/me/work-items' });

import webhookRoutes from './routes/webhooks.js';
await app.register(webhookRoutes, { prefix: '/api/webhooks' });


import inboundRoutes from './routes/inbound.js';
await app.register(inboundRoutes, { prefix: '/api/v1/inbound' });

import mcpHttpRoutes from './routes/mcp-http.js';
import mcpHealthRoutes from './routes/mcp-health.js';
await app.register(mcpHttpRoutes, { prefix: '/mcp' });
await app.register(mcpHealthRoutes, { prefix: '/api/mcp' });

import integrationRoutes from './routes/integrations.js';
await app.register(integrationRoutes, { prefix: '/api/integrations' });

import timelineRoutes from './routes/timeline.js';
await app.register(timelineRoutes, { prefix: '/api/timeline' });
import agentActivityRoutes from './routes/agent-activity.js';
await app.register(agentActivityRoutes, { prefix: '/api/agent-activity' });

import resumeBriefRoutes from './routes/resume-brief.js';
import digestRoutes from './routes/digest.js';
await app.register(resumeBriefRoutes, { prefix: '/api/resume-brief' });
await app.register(digestRoutes, { prefix: '/api/v1/digest' });

import nudgeRoutes from './routes/nudge.js';
await app.register(nudgeRoutes, { prefix: '/api/v1' });

<<<<<<< HEAD
import workspacesRoutes from './routes/workspaces.js';
import workspaceMembersRoutes from './routes/workspace-members.js';
import handoffsRoutes from './routes/handoffs.js';
await app.register(workspacesRoutes, { prefix: '/api/v1/workspaces' });
await app.register(workspaceMembersRoutes, { prefix: '/api/v1/workspaces' });
await app.register(handoffsRoutes, { prefix: '/api/v1/handoffs' });
=======
import workspaceRoutes from './routes/workspaces.js';
import workspaceMemberRoutes from './routes/workspace-members.js';
await app.register(workspaceRoutes, { prefix: '/api/workspaces' });
await app.register(workspaceMemberRoutes, { prefix: '/api/workspaces' });
>>>>>>> ae3ca82 (feat: Phase 3 Handoff Recipient UX (WS3.1-3.4))

import llmProxyRoutes from './routes/llm-proxy.js';
import desktopRoutes from './routes/desktop.js';
import proxyAnalyticsRoutes from './routes/proxy-analytics.js';
await app.register(llmProxyRoutes, { prefix: '/proxy' });
await app.register(desktopRoutes, { prefix: '/api/desktop' });
await app.register(proxyAnalyticsRoutes, { prefix: '/api/proxy' });

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

  // Start nudge scheduler — runs every hour
  const { runNudgeScheduler } = await import('./services/nudge.service.js');
  setInterval(async () => {
    try {
      await runNudgeScheduler();
    } catch (err) {
      app.log.error(err, '[nudge] Scheduler error');
    }
  }, 60 * 60 * 1000); // 1 hour
  // Run once on startup after a short delay
  setTimeout(() => runNudgeScheduler().catch(err => app.log.error(err, '[nudge] Initial run error')), 10_000);

  // Auto-tune model profiles if stale (> 7 days)
  setTimeout(() => maybeAutoTune().catch(err => app.log.error(err, '[model-tuner] Auto-tune error')), 15_000);

  // Start weekly digest scheduler — checks every hour, sends on Monday 9am UTC
  const { runWeeklyDigest } = await import('./services/digest.service.js');
  const checkAndRunDigest = async () => {
    const now = new Date();
    const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon
    const utcHour = now.getUTCHours();
    // Run on Monday between 9:00-9:59 UTC
    if (utcDay === 1 && utcHour === 9) {
      try {
        await runWeeklyDigest();
      } catch (err) {
        app.log.error(err, '[digest] Weekly digest error');
      }
    }
  };
  setInterval(checkAndRunDigest, 60 * 60 * 1000); // Check every hour
  // Also check on startup (in case server restarted during the window)
  setTimeout(checkAndRunDigest, 15_000);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
