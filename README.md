# AI Drive

AI-powered cloud drive delivered through an Edge extension.

## Structure

```
ai-drive/
├── apps/
│   ├── edge-extension/    # Edge extension frontend (New Tab, popup, options)
│   └── api-server/        # Backend API server
├── packages/
│   ├── shared-types/      # Shared TypeScript types
│   ├── api-contract/      # Generated API client & types
│   └── ui-tokens/         # Design tokens
├── docs/
│   ├── product/           # PRD, roadmap
│   ├── architecture/      # System overview, frontend/backend arch, ADRs
│   ├── contracts/         # OpenAPI spec, error model, webhook events
│   └── agent/             # Agent operating rules
└── infra/                 # Infrastructure configs
```

## Getting Started

```bash
pnpm install
pnpm dev
```
