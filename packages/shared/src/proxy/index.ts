/**
 * Shared LLM proxy core.
 *
 * Both Desktop (Node http server) and API (Fastify) delegate to these
 * pure functions so the context-injection + forwarding + harvest logic
 * lives in one place.
 */

import type {
  ChatMessage,
  ChatCompletionRequest,
  ContextSearchResult,
  ProxyAdapter,
  ForwardOptions,
} from './types.js';

// ─── Context injection ──────────────────────────────────────────────

const CONTEXT_SYSTEM_TEMPLATE = (snippet: string) =>
  `[DriveMem Context] The following knowledge from the user's knowledge base may be relevant:\n\n${snippet}\n\nUse this context when relevant. Cite sources when using specific information.`;

export function extractUserQuery(messages: ChatMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === 'user');
  return typeof last?.content === 'string' ? last.content : '';
}

export function formatContextSnippet(results: ContextSearchResult[]): string {
  if (results.length === 0) return '';
  return results
    .map((r, i) => `[${i + 1}] ${r.fileName}: ${r.text.slice(0, 300)}`)
    .join('\n\n');
}

export function injectContext(
  messages: ChatMessage[],
  contextSnippet: string,
): ChatMessage[] {
  if (!contextSnippet) return messages;
  const copy = [...messages];
  const contextMsg: ChatMessage = {
    role: 'system',
    content: CONTEXT_SYSTEM_TEMPLATE(contextSnippet),
  };
  const lastSystemIdx = copy.reduce(
    (acc, m, i) => (m.role === 'system' ? i : acc),
    -1,
  );
  copy.splice(lastSystemIdx + 1, 0, contextMsg);
  return copy;
}

// ─── Stream text collector ──────────────────────────────────────────

export function collectStreamedText(chunk: string, acc: string): string {
  const lines = chunk
    .split('\n')
    .filter((l) => l.startsWith('data: ') && !l.includes('[DONE]'));
  let result = acc;
  for (const line of lines) {
    try {
      const data = JSON.parse(line.slice(6));
      result += data.choices?.[0]?.delta?.content || '';
    } catch {
      // skip malformed
    }
  }
  return result;
}

// ─── High-level forward ─────────────────────────────────────────────

/**
 * Forward a chat completion request to an upstream LLM, injecting
 * DriveMem context and harvesting the response.
 *
 * Returns enough information for the caller (Desktop http / Fastify)
 * to write its own HTTP response in the appropriate framework style.
 */
export async function forwardChatCompletion(opts: ForwardOptions): Promise<{
  status: number;
  isStream: boolean;
  /** Non-streaming: parsed JSON body */
  jsonBody?: unknown;
  /** Streaming: the raw fetch Response (caller pipes the body) */
  streamResponse?: Response;
  /**
   * For streaming, call this *after* the stream is fully consumed
   * to trigger harvest. For non-streaming it is called automatically.
   */
  afterStream?: (fullText: string) => void;
}> {
  const { targetUrl, authorization, body, adapter } = opts;
  const messages = body.messages || [];
  const query = extractUserQuery(messages);

  // 1. Context injection
  let injected = messages;
  if (query && query.length > 5) {
    try {
      const results = await adapter.searchContext(query);
      const snippet = formatContextSnippet(results);
      injected = injectContext(messages, snippet);
    } catch {
      // context search failure is non-fatal
    }
  }

  // 2. Forward
  const isStream = body.stream === true;
  const forwardBody = { ...body, messages: injected };

  const llmRes = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify(forwardBody),
  });

  const triggerHarvest = (fullText: string) => {
    if (fullText.length > 100) {
      adapter.harvest(query, fullText).catch(() => {});
    }
  };

  if (isStream) {
    return {
      status: llmRes.status,
      isStream: true,
      streamResponse: llmRes,
      afterStream: triggerHarvest,
    };
  }

  // Non-streaming
  const data = await llmRes.json();
  const assistantContent =
    (data as any).choices?.[0]?.message?.content || '';
  triggerHarvest(assistantContent);

  return { status: llmRes.status, isStream: false, jsonBody: data };
}
