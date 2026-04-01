import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { jwtVerify } from 'jose';
import { config } from '../lib/config.js';
import { AppError, ErrorCodes } from '../lib/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; email: string; name: string };
  }
}

const secret = new TextEncoder().encode(config.JWT_SECRET);

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('user', undefined);

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return;

    try {
      const token = auth.slice(7);
      const { payload } = await jwtVerify(token, secret);
      request.user = {
        id: payload.sub as string,
        email: payload.email as string,
        name: payload.name as string,
      };
    } catch {
      // Token invalid — don't set user, let requireAuth handle 401
    }
  });
}

export async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
  if (!request.user) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401);
  }
}

export default fp(authPlugin, { name: 'auth' });
