# Contributing to DriveMem

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/DriveMem/drivemem.git
cd drivemem
pnpm install
```

### Prerequisites
- Node.js 18+
- pnpm 8+
- PostgreSQL 15+
- An embedding API key (DashScope or OpenAI compatible)

### Environment
```bash
cp apps/api/.env.example apps/api/.env
# Edit with your credentials
```

### Run Development
```bash
pnpm run dev
```
This starts the API server (port 3001) and web frontend (port 3000).

## Project Structure

- `apps/api/` — Backend API (Fastify + TypeScript)
- `apps/web/` — Frontend (Next.js + React)
- `packages/sdk/` — CLI, MCP bridge, LLM Proxy (MIT licensed)
- `packages/shared/` — Shared types and utilities

## Pull Requests

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Run tests if available
5. Submit a PR with a clear description

## Code Style

- TypeScript throughout
- ESM modules
- Functional components (React)
- Drizzle ORM for database

## License

By contributing, you agree that your contributions will be licensed under the project's AGPL-3.0 license (or MIT for `packages/sdk/`).
