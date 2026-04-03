import { pipeline } from '@xenova/transformers';

const MODEL_NAME = 'Xenova/bge-small-zh-v1.5';
const EMBEDDING_DIM = 512;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedder: any = null;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;

const RELEASE_DELAY_MS = 60_000; // Release model 60s after last use

async function getEmbedder() {
  // Cancel pending release
  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  if (!embedder) {
    console.log(`[embedding] Loading model ${MODEL_NAME}...`);
    embedder = await pipeline('feature-extraction', MODEL_NAME, { quantized: true });
    console.log(`[embedding] Model loaded. Dimension: ${EMBEDDING_DIM}`);
  }
  return embedder;
}

function scheduleRelease() {
  if (releaseTimer) clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => {
    console.log('[embedding] Releasing model to free memory');
    embedder = null;
    releaseTimer = null;
    if (global.gc) global.gc();
  }, RELEASE_DELAY_MS);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const model = await getEmbedder();
  const results: number[][] = [];

  for (const text of texts) {
    const output = await model(text, { pooling: 'cls', normalize: true });
    results.push(Array.from(output.data as Float32Array));
  }

  // Schedule model release after batch completes
  scheduleRelease();

  return results;
}

export function getEmbeddingDimension(): number { return EMBEDDING_DIM; }
