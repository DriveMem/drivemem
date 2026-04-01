import type { Context, Next } from 'hono';
import type { Env } from '../types.js';

/**
 * Cloudflare Cache API middleware for Hono.
 * Caches GET responses using the Cache API with configurable TTL.
 *
 * Note: Cache API only works in deployed Workers, not in local dev (wrangler dev).
 * In local dev, this middleware is a no-op passthrough.
 */
export function cacheMiddleware(ttlSeconds: number = 30) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Only cache GET requests
    if (c.req.method !== 'GET') {
      await next();
      return;
    }

    const cacheKey = new Request(c.req.url, { method: 'GET' });
    const cache = caches.default;

    // Try cache first
    try {
      const cached = await cache.match(cacheKey);
      if (cached) {
        return cached;
      }
    } catch {
      // Cache API not available (local dev), continue
    }

    await next();

    // Clone response and store in cache
    const response = c.res.clone();

    // Add cache control headers
    const cachedResponse = new Response(response.body, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'Cache-Control': `public, max-age=${ttlSeconds}`,
        'X-Cache-TTL': `${ttlSeconds}`,
      },
    });

    try {
      c.executionCtx.waitUntil(cache.put(cacheKey, cachedResponse));
    } catch {
      // Cache API not available (local dev), ignore
    }
  };
}
