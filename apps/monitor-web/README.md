# AI Drive Monitor Web

Real-time monitoring dashboard for the AI Drive multi-agent system.

## Stack

- [Astro](https://astro.build/) (static output)
- React components
- Tailwind CSS
- TypeScript

## Development

```bash
pnpm dev
```

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed:

| Variable | Description | Default |
|---|---|---|
| `PUBLIC_API_BASE` | Monitor worker API base URL | `https://monitor-worker.ai-drive-monitor.workers.dev/api` |

## Build

```bash
pnpm build
```

Output goes to `dist/`.

## Deploy to Cloudflare Pages

This is a static site — no SSR adapter needed.

### Via Cloudflare Dashboard

1. Connect the GitHub repo in Cloudflare Pages
2. Set **Build command**: `cd ../.. && pnpm build --filter @ai-drive/monitor-web`
3. Set **Build output directory**: `apps/monitor-web/dist`
4. Set **Root directory**: `/` (monorepo root)
5. Add environment variables as needed (e.g. `PUBLIC_API_BASE`)

### Via Wrangler CLI

```bash
pnpm build
npx wrangler pages deploy dist --project-name=ai-drive-monitor
```
