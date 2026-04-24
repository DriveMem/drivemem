import { FastifyInstance } from 'fastify';

// In-memory cache with 1h TTL
let cache: { data: any; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function fetchLatestRelease() {
  const res = await fetch(
    'https://api.github.com/repos/yufuche1/ai-drive/releases/latest',
    {
      headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'DriveMem-API' },
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

export default async function desktopRoutes(fastify: FastifyInstance) {
  fastify.get('/latest-version', async (_request, reply) => {
    // Check cache
    if (cache && Date.now() < cache.expiresAt) {
      return reply.send(cache.data);
    }

    try {
      const release = await fetchLatestRelease();
      const tagName: string = release.tag_name || '';
      const version = tagName.replace(/^v/, '');
      const body: string = release.body || '';
      const summary = body.split('\n').find((l: string) => l.trim())?.trim() || '';

      const data = {
        version,
        summary,
        downloadUrl: 'https://drivemem.cloud/download',
        releaseNotesUrl: `https://github.com/yufuche1/ai-drive/releases/tag/${tagName}`,
        publishedAt: release.published_at || null,
      };

      cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
      return reply.send(data);
    } catch (err) {
      fastify.log.warn({ err }, 'Failed to fetch latest release from GitHub');
      return reply.send({ version: null });
    }
  });
}
