# drivemem

TypeScript SDK for DriveMem — connect any AI agent to shared knowledge.

## Install
```bash
npm install drivemem
```

## Quick Start
```typescript
import { DriveMem } from 'drivemem'

const mem = new DriveMem({ apiKey: 'ak_your_key' })

// Search knowledge
const results = await mem.search('product strategy')

// Ask a question (RAG)
const answer = await mem.ask('What decisions were made about pricing?')

// Store knowledge
await mem.store('Decision: Free tier for first 100 users', { title: 'Pricing decision' })

// Compile briefing for a task
const briefing = await mem.compile('Write a go-to-market plan')
console.log(briefing.compiledContext)

// Check connection
const ok = await mem.ping()
```

## API

### `new DriveMem(config)`
- `apiKey` (required) — Your DriveMem API key
- `endpoint` (optional) — API endpoint, default `https://drivemem.cloud`

### Methods
| Method | Description |
|--------|-------------|
| `search(query)` | Semantic search across knowledge base |
| `ask(question)` | RAG Q&A with cited sources |
| `store(content, options?)` | Save knowledge |
| `compile(task, options?)` | Generate task-relevant context briefing |
| `files()` | List all files |
| `identity()` | Get user profile |
| `ping()` | Verify connection |

## Use with Agent Frameworks

### LangChain
```typescript
const mem = new DriveMem({ apiKey: process.env.DRIVEMEM_KEY })
const context = await mem.compile('current task description')
// Pass context.compiledContext as system prompt prefix
```

### Any Agent
```typescript
// On agent start
const briefing = await mem.compile(taskDescription)

// During work
const relevant = await mem.search(currentTopic)

// On completion
await mem.store(conclusions, { title: 'Task result', tags: 'decision' })
```
