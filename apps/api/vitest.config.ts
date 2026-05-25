import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.test into an object for vitest's env option
function parseEnvFile(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const content = readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
      }
    }
  } catch {}
  return env;
}

const testEnv = parseEnvFile(resolve(__dirname, '.env.test'));

// Also set in current process for config-time imports
for (const [k, v] of Object.entries(testEnv)) {
  if (!process.env[k]) process.env[k] = v;
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    root: './tests',
    setupFiles: [],
    testTimeout: 30000,
    hookTimeout: 30000,
    env: testEnv,
  },
});
