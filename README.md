<div align="center">

# DriveMem

**One memory. Every agent.**

The open-source memory layer for AI tools. Give your AI agents persistent, cross-tool knowledge.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/DriveMem/drivemem?style=social)](https://github.com/DriveMem/drivemem)
[![npm](https://img.shields.io/npm/v/drivemem)](https://www.npmjs.com/package/drivemem)
[![npm downloads](https://img.shields.io/npm/dm/drivemem)](https://www.npmjs.com/package/drivemem)

[Website](https://drivemem.cloud) · [Docs](https://drivemem.cloud/docs/quickstart) · [API Reference](https://drivemem.cloud/docs/api) · [Discord](https://discord.gg/drivemem)

[**Try DriveMem Cloud Free →**](https://drivemem.cloud/signup)

</div>

---

## ⚡ 30-Second Start

```bash
# Sign up at drivemem.cloud, then:
npx drivemem setup
```

That's it. Cursor, Claude Desktop, and Windsurf are now connected to your knowledge base.

---

## What is DriveMem?

DriveMem is a persistent knowledge layer that connects all your AI tools. Upload files, have conversations, and every AI agent you use — Cursor, Claude, Windsurf, or any MCP client — automatically gets the context it needs.

**Think of it as iCloud for your AI agents.** One knowledge base, seamless continuity across every tool.

## Why DriveMem?

| Feature | DriveMem | Mem0 | Claude Projects |
|---------|----------|------|-----------------|
| Open source | ✅ AGPL-3.0 | ✅ Apache-2.0 | ❌ |
| Self-hostable | ✅ | ✅ | ❌ |
| MCP native | ✅ One URL, any client | ❌ SDK only | ❌ |
| Cross-tool memory | ✅ Any MCP client | ✅ API only | ❌ Single tool |
| File sync (Drive/Notion) | ✅ | ❌ | ❌ |
| LLM API Proxy | ✅ Auto-inject context | ❌ | ❌ |
| Claude Code Hooks | ✅ Auto-capture sessions | ❌ | ❌ |
| Self-learning search | ✅ Feedback + citations | ❌ | ❌ |

## Quick Start

### Connect to DriveMem Cloud (fastest)

```bash
npx drivemem setup
```

One command configures Cursor, Claude Desktop, and Windsurf. Get your API key at [drivemem.cloud/settings](https://drivemem.cloud/settings).

### Self-Host

```bash
git clone https://github.com/DriveMem/drivemem.git
cd drivemem
cp apps/api/.env.example apps/api/.env
# Edit .env with your database and LLM API credentials
pnpm install
pnpm run dev
```

Requirements: Node.js 18+, PostgreSQL 15+, an embedding API key (OpenAI, DashScope, or compatible).

## How It Works

```
Your AI Tools (Cursor, Claude, Windsurf, any MCP client)
        ↕ MCP Protocol / API Proxy
    ┌─────────────────────────┐
    │       DriveMem          │
    │  ┌─────────────────┐    │
    │  │ Knowledge Base   │    │
    │  │ Files + Chunks   │    │
    │  │ Vector Embeddings│    │
    │  └─────────────────┘    │
    │  ┌─────────────────┐    │
    │  │ Context Compiler │    │
    │  │ 9-step pipeline  │    │
    │  │ Model-aware      │    │
    │  └─────────────────┘    │
    │  ┌─────────────────┐    │
    │  │ Data Flywheel    │    │
    │  │ Search feedback  │    │
    │  │ Citation tracking│    │
    │  │ Usage patterns   │    │
    │  └─────────────────┘    │
    └─────────────────────────┘
```

## Features

- **📁 Knowledge Base** — Upload files (PDF, Word, Markdown, TXT). Auto-parsed, chunked, and embedded.
- **🔍 Semantic Search** — Find anything in your knowledge base with natural language.
- **🤖 MCP Server** — Connect any MCP-compatible AI tool with one URL.
- **🔌 LLM API Proxy** — Auto-inject context into any OpenAI/Anthropic API call.
- **🪝 Claude Code Hooks** — Auto-capture session knowledge after every coding session.
- **📊 Self-Learning** — Search gets better with usage. Feedback, citations, and usage patterns improve ranking.
- **🔄 Connectors** — Sync from Google Drive, with more coming.
- **💻 Desktop App** — Available for macOS, Windows, and Linux.

## Integrations

| Tool | Method | Setup |
|------|--------|-------|
| **Cursor** | MCP (native) | `npx drivemem setup` |
| **Claude Desktop** | MCP (stdio bridge) | `npx drivemem setup` |
| **Windsurf** | MCP (native) | `npx drivemem setup` |
| **Claude Code** | Hooks (auto-capture) | `npx drivemem setup claude-code` |
| **Any LLM API** | Proxy | `npx drivemem proxy --api-key=...` |
| **REST API** | HTTP | [API docs](https://drivemem.cloud/docs/api) |

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Fastify, TypeScript, Drizzle ORM
- **Database**: PostgreSQL + pgvector
- **Embedding**: text-embedding-v3 (DashScope/OpenAI compatible)
- **MCP**: @modelcontextprotocol/sdk (SSE + Streamable HTTP)
- **Desktop**: Electron

## Project Structure

```
drivemem/
├── apps/
│   ├── api/          # Backend API (Fastify)
│   └── web/          # Frontend (Next.js)
├── packages/
│   ├── sdk/          # CLI + MCP bridge + Proxy (MIT licensed)
│   ├── shared/       # Shared types and utilities
│   └── desktop/      # Electron desktop app
└── docs/             # Deployment guides
```

## SDK (MIT Licensed)

The DriveMem SDK (`packages/sdk/`) is licensed under MIT for maximum compatibility. Use it freely in any project:

```bash
npm install drivemem
```

```javascript
// Setup MCP for all AI tools
npx drivemem setup --api-key=ak_xxx

// Start LLM API Proxy
npx drivemem proxy --api-key=ak_xxx

// Configure Claude Code hooks
npx drivemem setup claude-code
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Clone and setup
git clone https://github.com/DriveMem/drivemem.git
cd drivemem
pnpm install

# Start development
pnpm run dev  # Starts API + Web in dev mode
```

## License

- **SDK/CLI** (`packages/sdk/`): [MIT](packages/sdk/LICENSE)
- **Everything else**: [AGPL-3.0](LICENSE)

## Cloud vs Self-Host

| | DriveMem Cloud | Self-Host |
|---|---|---|
| Setup | 1 command | Deploy yourself |
| Data flywheel | ✅ Cross-user learning | ❌ Single-user only |
| Model profiles | ✅ Auto-optimized | ❌ Static defaults |
| Updates | Automatic | Manual |
| Price | Free tier available | Free forever |

[Try DriveMem Cloud →](https://drivemem.cloud)
