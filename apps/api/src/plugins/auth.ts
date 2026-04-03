import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { jwtVerify, jwtDecrypt } from 'jose';
import crypto from 'node:crypto';
import { config } from '../lib/config.js';
import { AppError, ErrorCodes } from '../lib/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; email: string; name: string };
  }
}

const secret = new TextEncoder().encode(config.JWT_SECRET);

// Derive encryption key for NextAuth JWE using HKDF (same as NextAuth internals)
function deriveEncryptionKey(): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    crypto.hkdf('sha256', config.JWT_SECRET, '', 'NextAuth.js Generated Encryption Key', 32, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(new Uint8Array(derivedKey));
    });
  });
}

let encryptionKeyPromise: Promise<Uint8Array> | null = null;
function getEncryptionKey(): Promise<Uint8Array> {
  if (!encryptionKeyPromise) {
    encryptionKeyPromise = deriveEncryptionKey();
  }
  return encryptionKeyPromise;
}

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('user', undefined);

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    // Strategy 1: Authorization Bearer header (plain JWS JWT)
    const auth = request.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      try {
        const token = auth.slice(7);
        const { payload } = await jwtVerify(token, secret);
        request.user = {
          id: payload.sub as string,
          email: payload.email as string,
          name: payload.name as string,
        };
        return;
      } catch {
        // Fall through to cookie strategy
      }
    }

    // Strategy 2: NextAuth session cookie (JWE encrypted)
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) return;

    // Parse cookies to find NextAuth session token
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [key, ...rest] = c.trim().split('=');
        return [key, rest.join('=')];
      })
    );

    const sessionToken = cookies['next-auth.session-token'] || cookies['__Secure-next-auth.session-token'];
    if (!sessionToken) return;

    try {
      const encKey = await getEncryptionKey();
      const { payload } = await jwtDecrypt(sessionToken, encKey);
      const userId = (payload.sub || payload.id || '') as string;
      if (!userId) return; // Invalid payload — skip
      request.user = {
        id: userId,
        email: (payload.email || '') as string,
        name: (payload.name || '') as string,
      };
    } catch {
      // Cookie invalid — don't set user
    }
  });
}

export async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
  if (!request.user) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401);
  }
}

export default fp(authPlugin, { name: 'auth' });
