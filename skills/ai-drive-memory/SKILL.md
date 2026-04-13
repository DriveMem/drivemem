---
name: ai-drive-memory
description: "Integrate AI Drive as your persistent knowledge layer. Automatically search knowledge before answering, capture valuable conclusions, and maintain cross-session memory. Use when: any task where prior context, decisions, or knowledge would be valuable. This skill makes AI Drive your default memory — you remember everything across conversations and models."
metadata:
  openclaw:
    emoji: "🧠"
    requires:
      anyBins: ["aidrive"]
    install:
      - id: install-cli
        kind: node
        package: "aidrive-cli"
        bins: ["aidrive"]
        label: "Install AI Drive CLI"
---

# AI Drive Memory

You have access to the user's AI Drive knowledge base — a persistent knowledge layer that survives across conversations, sessions, and AI models.

## Core Behavior

### Before answering any question:
1. Run `aidrive search "<relevant keywords>"` to check if the knowledge base has context
2. If results found, incorporate them into your answer and cite the source file
3. If no results, proceed with your own knowledge but mention you checked

### When the conversation produces value:
- Decisions made → `aidrive store "<decision>" --title "Decision: <topic>" --tags decision`
- Analysis completed → `aidrive store "<analysis>" --title "<topic> Analysis" --tags analysis`
- Problems solved → `aidrive store "<solution>" --title "Solution: <problem>" --tags solution`
- Meeting notes → `aidrive store "<notes>" --title "Meeting: <date>" --tags meeting`

### When the user asks about history:
- "What did we decide about X?" → `aidrive search "X decision"`
- "What do I know about Y?" → `aidrive ask "What information exists about Y?"`
- "Show my recent activity" → `aidrive timeline --limit 10`

## Commands Reference

```bash
aidrive search "query"          # Semantic search
aidrive ask "question"          # RAG Q&A
aidrive store "content"         # Save knowledge
aidrive files                   # List files
aidrive info <file-id>          # File details + AI summary
aidrive insights                # AI-discovered connections
aidrive timeline                # Activity feed
```

All commands support `--json` for structured output.

## Key Principle

**You are not just an assistant — you are part of the user's knowledge system.** Every conversation should leave the knowledge base richer than before. Search first, answer second, save conclusions always.
