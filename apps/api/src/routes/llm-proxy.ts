import { FastifyInstance } from 'fastify';
import { requireApiKey } from '../plugins/api-key-auth.js';
import { searchSimilar } from '../services/vector.service.js';
import { embedTexts } from '../services/embedding.service.js';
import { autoCapture } from '../services/auto-capture.js';

export default async function llmProxyRoutes(fastify: FastifyInstance) {
  // POST /proxy/v1/chat/completions — OpenAI compatible proxy
  // DriveMem auth: ?apiKey=ak_xxx (query param)
  // LLM auth: Authorization: Bearer sk-xxx (pass-through to upstream LLM)
  fastify.post('/v1/chat/completions', {
    preHandler: [requireApiKey],
  }, async (request, reply) => {
    const userId = request.user!.id;
    const body = request.body as any;

    // 1. Extract last user message
    const messages: Array<{ role: string; content: string }> = body.messages || [];
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const query = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : '';

    // 2. Search DriveMem for relevant context
    let contextSnippet = '';
    if (query) {
      try {
        const [queryVec] = await embedTexts([query]);
        const chunks = await searchSimilar({
          userId,
          query: queryVec,
          queryText: query,
          scopeType: 'all',
          limit: 5,
        });
        if (chunks.length > 0) {
          contextSnippet = chunks
            .map((c, i) => `[${i + 1}] ${c.fileName}: ${c.text.slice(0, 300)}`)
            .join('\n\n');
        }
      } catch (err) {
        fastify.log.warn({ err }, 'llm-proxy: context search failed');
      }
    }

    // 3. Inject context as system message
    const injectedMessages = [...messages];
    if (contextSnippet) {
      const contextMsg = {
        role: 'system' as const,
        content: `[DriveMem Context] The following knowledge from the user's knowledge base may be relevant:\n\n${contextSnippet}\n\nUse this context when relevant. Cite sources when using specific information.`,
      };
      const lastSystemIdx = injectedMessages.reduce(
        (acc, m, i) => (m.role === 'system' ? i : acc),
        -1,
      );
      injectedMessages.splice(lastSystemIdx + 1, 0, contextMsg);
    }

    // 4. LLM target — Authorization header is pass-through
    const llmApiKey = request.headers.authorization; // "Bearer sk-xxx"
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

    // 5. Forward to real LLM
    const targetUrl = `${llmBaseUrl.replace(/\/+$/, '')}/v1/chat/completions`;
    const forwardBody = { ...body, messages: injectedMessages };
    const isStream = body.stream === true;

    const llmResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: llmApiKey,
      },
      body: JSON.stringify(forwardBody),
    });

    if (isStream) {
      reply.raw.writeHead(llmResponse.status, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      const reader = llmResponse.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            reply.raw.write(chunk);

            // Collect streamed content for async extraction
            const lines = chunk
              .split('\n')
              .filter((l) => l.startsWith('data: ') && !l.includes('[DONE]'));
            for (const line of lines) {
              try {
                const data = JSON.parse(line.slice(6));
                const delta = data.choices?.[0]?.delta?.content || '';
                fullResponse += delta;
              } catch {}
            }
          }
        } finally {
          reply.raw.end();
        }
      }

      // 6. Async extract conclusions
      if (fullResponse.length > 100) {
        asyncExtract(userId, query, fullResponse, fastify).catch(() => {});
      }

      return reply.hijack();
    } else {
      // Non-streaming
      const data = (await llmResponse.json()) as any;
      const assistantContent = data.choices?.[0]?.message?.content || '';

      // 6. Async extract
      if (assistantContent.length > 100) {
        asyncExtract(userId, query, assistantContent, fastify).catch(() => {});
      }

      return reply.status(llmResponse.status).send(data);
    }
  });

  // Health check
  fastify.get('/health', async () => ({ status: 'ok', service: 'llm-proxy' }));
}

async function asyncExtract(
  userId: string,
  query: string,
  response: string,
  fastify: FastifyInstance,
) {
  try {
    await autoCapture(userId, `Q: ${query}\n\nA: ${response}`);
  } catch (err) {
    fastify.log.warn({ err }, 'llm-proxy: async extraction failed');
  }
}
