# Operating Model

## Agent System Overview

AI Drive uses a multi-agent system with specialized agents working within defined boundaries.

## Agents

| Agent | Role | Contract Relationship |
|-------|------|----------------------|
| Frontend Agent | Edge extension UI implementation | Consumer |
| Backend Agent | API server, storage, AI services | Publisher |

## Task Lifecycle

1. Task packet created from template
2. Assigned agent reads its spec + task packet + relevant docs
3. Agent implements within allowed paths only
4. Agent validates using specified commands
5. Agent produces handoff using the handoff template
6. Task assessed against Definition of Done

## Collaboration Rules

- Agents collaborate through **documented artifacts only**
- No assumptions, no verbal agreements, no undocumented behavior
- Frontend consumes contracts; Backend publishes contracts
- Handoff notes are the primary inter-agent communication channel

## Conflict Resolution Priority

1. Approved ADR
2. OpenAPI / contract docs
3. Architecture docs
4. Task packet
5. Existing implementation

## Session Independence

Each agent session is stateless. Continuity comes from:
- Source-of-truth documents
- Task packets
- Handoff notes
- Code and commit history
