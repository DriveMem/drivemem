import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../lib/config.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

const BATCH_SIZE = 100;

function getAnthropicClient(): Anthropic {
  if (!config.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required when LLM_PROVIDER is anthropic');
  }
  return new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
}

export async function* streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
  const systemMessages = messages.filter((m) => m.role === 'system');
  const chatMessages = messages.filter((m) => m.role !== 'system');
  const systemPrompt = systemMessages.map((m) => m.content).join('\n\n');

  if (config.LLM_PROVIDER === 'anthropic') {
    const client = getAnthropicClient();
    const model = config.LLM_MODEL || 'claude-3-5-haiku-latest';

    const stream = client.messages.stream({
      model,
      max_tokens: config.LLM_MAX_TOKENS,
      temperature: config.LLM_TEMPERATURE,
      system: systemPrompt || undefined,
      messages: chatMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  } else {
    const model = config.LLM_MODEL || 'gpt-4o-mini';

    const openaiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    if (systemPrompt) {
      openaiMessages.push({ role: 'system', content: systemPrompt });
    }
    for (const m of chatMessages) {
      openaiMessages.push({ role: m.role as 'user' | 'assistant', content: m.content });
    }

    const stream = await openai.chat.completions.create({
      model,
      stream: true,
      max_tokens: config.LLM_MAX_TOKENS,
      temperature: config.LLM_TEMPERATURE,
      messages: openaiMessages,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}

export async function chat(messages: ChatMessage[]): Promise<string> {
  const systemMessages = messages.filter((m) => m.role === 'system');
  const chatMessages = messages.filter((m) => m.role !== 'system');
  const systemPrompt = systemMessages.map((m) => m.content).join('\n\n');

  if (config.LLM_PROVIDER === 'anthropic') {
    const client = getAnthropicClient();
    const model = config.LLM_MODEL || 'claude-3-5-haiku-latest';

    const response = await client.messages.create({
      model,
      max_tokens: config.LLM_MAX_TOKENS,
      temperature: config.LLM_TEMPERATURE,
      system: systemPrompt || undefined,
      messages: chatMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    return textBlock ? textBlock.text : '';
  } else {
    const model = config.LLM_MODEL || 'gpt-4o-mini';

    const openaiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    if (systemPrompt) {
      openaiMessages.push({ role: 'system', content: systemPrompt });
    }
    for (const m of chatMessages) {
      openaiMessages.push({ role: m.role as 'user' | 'assistant', content: m.content });
    }

    const response = await openai.chat.completions.create({
      model,
      max_tokens: config.LLM_MAX_TOKENS,
      temperature: config.LLM_TEMPERATURE,
      messages: openaiMessages,
    });

    return response.choices[0]?.message?.content ?? '';
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    });
    for (const item of response.data) {
      allEmbeddings.push(item.embedding);
    }
  }

  return allEmbeddings;
}
