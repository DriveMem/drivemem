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

await app.register(cors, { origin: config.FRONTEND_URL, credentials: true });
await app.register(sensible);
await app.register(errorHandler);

import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import conversationRoutes from './routes/conversations.js';

await app.register(authPlugin);
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(userRoutes, { prefix: '/api/users' });
await app.register(conversationRoutes, { prefix: '/api/conversations' });

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
