import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

// Demo account ID - set from env or hardcode after creation
const DEMO_USER_ID = process.env.DEMO_USER_ID || '';

const demoGuard: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    if (!DEMO_USER_ID || !request.user) return;
    if (request.user.id !== DEMO_USER_ID) return;

    const method = request.method;
    const url = request.url;

    // Allow reads
    if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD') return;

    // Allow conversation creation and message sending (demo can chat)
    if (method === 'POST' && url.includes('/api/conversations')) return;

    // Allow report generation (demo can generate reports)
    if (method === 'POST' && url.includes('/api/reports')) return;

    // Allow search
    if (method === 'POST' && url.includes('/api/search')) return;

    // Block all other writes (upload, delete, share, etc.)
    return reply.status(403).send({
      error: {
        code: 'DEMO_READONLY',
        message: 'Demo 账号为只读模式。注册账号后可使用完整功能。',
        status: 403,
      },
    });
  });
};

export default fp(demoGuard, { name: 'demo-guard' });
