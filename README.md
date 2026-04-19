# DriveMem

**One memory. Every agent.**

DriveMem gives all your AI tools a shared brain — so they remember what you care about.

> Your AI tools forget everything between sessions. DriveMem changes that. Knowledge captured by one agent is instantly available to all others.

## ✨ Features

- **🧠 Shared Memory** — Knowledge persists across sessions, models, and tools
- **🔄 Cross-Agent Flow** — What Claude learns, Cursor knows. Switch tools without repeating yourself
- **✨ Gets Smarter Over Time** — Discovers connections, detects conflicts, learns what matters to you
- **🔌 Connect Any Agent** — One URL. Works with Cursor, Claude Desktop, ChatGPT, and any MCP-compatible tool

## 🚀 Quick Start

### 1. Create an account

Sign up at [drivemem.cloud](https://drivemem.cloud)

### 2. Get your API Key

Go to **Settings → Developer** and create an API Key.

### 3. Connect your agent

**Cursor / Windsurf:**
```json
{
  "mcpServers": {
    "drivemem": {
      "url": "https://api.drivemem.cloud/mcp?apiKey=YOUR_API_KEY"
    }
  }
}
```

**Claude Desktop:**
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "drivemem": {
      "url": "https://api.drivemem.cloud/mcp?apiKey=YOUR_API_KEY"
    }
  }
}
```

**OpenClaw:**
```bash
openclaw config set mcp.servers.drivemem.url "https://api.drivemem.cloud/mcp/sse?apiKey=YOUR_API_KEY"
```

### 4. Try it

Once connected, your agent automatically has access to your knowledge base. Try:
- Asking questions about your files
- Storing decisions and notes
- Getting context-aware briefings

## 🔧 REST API

```bash
# Search knowledge
curl -X GET 'https://api.drivemem.cloud/api/v1/search?q=database+decision' \
  -H 'Authorization: Bearer YOUR_API_KEY'

# Store knowledge
curl -X POST 'https://api.drivemem.cloud/api/v1/store' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"content": "Decided to use PostgreSQL", "title": "DB Decision", "tags": "decision"}'

# RAG Q&A
curl -X POST 'https://api.drivemem.cloud/api/v1/ask' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"question": "What database did we choose?"}'

# Compile context briefing
curl -X POST 'https://api.drivemem.cloud/api/v1/context/compile' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"task": "Sprint planning for Q2"}'
```

## 📦 SDK

```bash
npm install drivemem
```

```typescript
import { DriveMem } from 'drivemem'

const dm = new DriveMem({ apiKey: 'YOUR_API_KEY' })

// Search
const results = await dm.search('database architecture')

// Store
await dm.store({ content: 'Chose PostgreSQL', title: 'DB Decision' })

// Ask
const answer = await dm.ask('What did we decide about the database?')
```

## 🏗️ How It Works

```
Agent works → Knowledge captured automatically
       ↓
DriveMem indexes, discovers connections, detects conflicts
       ↓
Next agent gets full context — no manual setup needed
```

**9-Step Context Compiler Pipeline:**
Retrieval → Project Boost → Feedback Weights → Knowledge Graph → Role Routing → Behavior Learning → Freshness Decay → Re-ranking → Token Budget

**4 Self-Learning Loops:**
1. Implicit Feedback — unused search results get downweighted
2. Behavior Learning — adapts to each agent's usage patterns
3. Freshness Decay — old unused knowledge fades
4. Compilation Quality — tracks and optimizes briefing effectiveness

## 🔌 Integrations

| Channel | Type | Status |
|---------|------|--------|
| MCP Protocol | Agent connection | ✅ Live |
| REST API | Programmatic access | ✅ Live |
| Webhook | Zapier/Make/n8n | ✅ Live |
| Email Forward | Email to knowledge | ✅ Live |
| Notion | Pull sync | ✅ Live |
| GitHub | Issues/PRs sync | ✅ Live |
| Google Drive | Document sync | ✅ Live |
| Browser Extension | Web clipper | ✅ v2 |

## 📄 License

MIT

## 🔗 Links

- **Website**: [drivemem.cloud](https://drivemem.cloud)
- **Docs**: [drivemem.cloud/developers](https://drivemem.cloud/developers)
