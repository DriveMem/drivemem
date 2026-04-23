import { FastifyInstance } from 'fastify';
import { requireApiKey } from '../plugins/api-key-auth.js';
import { searchSimilar } from '../services/vector.service.js';
import { embedTexts } from '../services/embedding.service.js';
import { autoCapture } from '../services/auto-capture.js';
import {
  forwardChatCompletion,
  collectStreamedText,
  type ProxyAdapter,
  type ContextSearchResult,
} from '@ai-drive/shared';

export default async function llmProxyRoutes(fastify: FastifyInstance) {
  fastify.post('/v1/chat/completions', {
    preHandler: [requireApiKey],
  }, async (request, reply) => {
    const userId = request.user!.id;
    const body = request.body as any;

    // Build adapter that uses server-side services directly
    const adapter: ProxyAdapter = {
      async searchContext(query: string): Promise<ContextSearchResult[]> {
        const [queryVec] = await embedTexts([query]);
        const chunks = await searchSimilar({
          userId,
          query: queryVec,
          queryText: query,
          scopeType: 'all',
          limit: 5,
        });
        return chunks.map((c) => ({ fileName: c.fileName, text: c.text }));
      },
      async harvest(query: string, response: string): Promise<void> {
        await autoCapture(userId, `Q: ${query}\n\nA: ${response}`);
      },
    };

    // Validate LLM auth
    const llmApiKey = request.headers.authorization;
    const llmBaseUrl =
      (request.headers['x-llm-base-url'] as string) || 'https://api.openai.com';

    if (!llmApiKey || llmApiKey.startsWith('Bearer ak_')) {
      return reply.status(400).send({
        error: {
          message:
            'Authorization header must contain your LLM API key (Bearer sk-xxx). Use ?apiKey=ak_xxx for DriveMem auth.',
          type: 'invalid_request_error',
        },
      });
    }

    const result = await forwardChatCompletion({
      targetUrl: `${llmBaseUrl.replace(/\/+$/, '')}/v1/chat/completions`,
      authorization: llmApiKey,
      body,
      adapter,
    });

    if (result.isStream && result.streamResponse?.body) {
      reply.raw.writeHead(result.status, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      const reader = result.streamResponse.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          reply.raw.write(chunk);
          fullText = collectStreamedText(chunk, fullText);
        }
      } finally {
        reply.raw.end();
      }

      result.afterStream?.(fullText);
      return reply.hijack();
    }

    // Non-streaming
    return reply.status(result.status).send(result.jsonBody);
  });

  // Health check
  fastify.get('/health', async () => ({ status: 'ok', service: 'llm-proxy' }));
}
