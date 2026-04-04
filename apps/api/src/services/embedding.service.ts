import { config } from '../lib/config.js';

const EMBEDDING_DIM = 1024; // text-embedding-v3 outputs 1024 dimensions

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  
  const baseUrl = config.EMBEDDING_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const model = config.EMBEDDING_MODEL || 'text-embedding-v3';
  const apiKey = config.EMBEDDING_API_KEY || config.OPENAI_API_KEY;
  
  const results: number[][] = [];
  
  // Process in batches of 10 (API limit)
  for (let i = 0; i < texts.length; i += 10) {
    const batch = texts.slice(i, i + 10);
    const response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: batch,
      }),
    });
    
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Embedding API error ${response.status}: ${errText}`);
    }
    
    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    results.push(...data.data.map((d: { embedding: number[] }) => d.embedding));
  }
  
  return results;
}

export function getEmbeddingDimension(): number { return EMBEDDING_DIM; }
