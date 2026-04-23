/** Common types for the LLM proxy pipeline. */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | string;
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  stream?: boolean;
  [key: string]: unknown;
}

export interface ContextSearchResult {
  fileName: string;
  text: string;
}

/**
 * Adapter that the consumer provides – these are the parts that differ
 * between Desktop (HTTP-based DriveMem API) and API (direct DB services).
 */
export interface ProxyAdapter {
  /** Search DriveMem for relevant context given a user query. */
  searchContext(query: string): Promise<ContextSearchResult[]>;
  /** Persist a Q&A pair after the LLM responds (fire-and-forget). */
  harvest(query: string, response: string): Promise<void>;
}

export interface ForwardOptions {
  /** Full target URL, e.g. "https://api.openai.com/v1/chat/completions" */
  targetUrl: string;
  /** Authorization header value to forward to the upstream LLM. */
  authorization: string;
  /** Original request body (will be patched with injected messages). */
  body: ChatCompletionRequest;
  /** Adapter for DriveMem context + harvest. */
  adapter: ProxyAdapter;
}

export interface ForwardResult {
  status: number;
  /** Set when stream=false */
  data?: unknown;
  /** Set when stream=true – the raw Response so the caller can pipe it. */
  streamResponse?: Response;
  /** Collected full assistant text (populated after streaming finishes). */
  fullText?: string;
}
