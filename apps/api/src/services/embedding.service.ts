import { pipeline } from '@xenova/transformers';

const MODEL_NAME = 'Xenova/bge-small-zh-v1.5';
const EMBEDDING_DIM = 512;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedder: any = null;

async function getEmbedder() {
  if (!embedder) {
    console.log(`[embedding] Loading model ${MODEL_NAME}...`);
    embedder = await pipeline('feature-extraction', MODEL_NAME, { quantized: true });
    console.log(`[embedding] Model loaded. Dimension: ${EMBEDDING_DIM}`);
  }
  return embedder;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const model = await getEmbedder();
  const results: number[][] = [];

  for (const text of texts) {
    const output = await model(text, { pooling: 'cls', normalize: true });
    results.push(Array.from(output.data as Float32Array));
  }

  return results;
}

export function getEmbeddingDimension(): number { return EMBEDDING_DIM; }
