# AGENTS.md — Agent Harness Overview

## Directory Structure

```
docs/agent/
├── AGENTS.md                          # This file
├── shared/
│   ├── operating-model.md             # How the multi-agent system works
│   ├── contract-first-policy.md       # Contract-first integration rules
│   └── repo-boundaries.md             # Directory ownership and cross-boundary rules
├── frontend/
│   ├── frontend-agent.md              # Frontend Agent formal spec
│   ├── frontend-agent.zh-CN.md        # Frontend Agent Chinese explanation
│   ├── task-packet-template.md        # Task packet template (frontend)
│   ├── handoff-template.md            # Handoff template (frontend)
│   ├── definition-of-done.md          # DoD checklist (frontend)
│   └── tasks/                         # Frontend task packets
└── backend/
    ├── backend-agent.md               # Backend Agent formal spec
    ├── backend-agent.zh-CN.md         # Backend Agent Chinese explanation
    ├── task-packet-template.md        # Task packet template (backend)
    ├── handoff-template.md            # Handoff template (backend)
    ├── definition-of-done.md          # DoD checklist (backend)
    └── tasks/                         # Backend task packets
```

## Quick Reference

| Agent | Spec | Scope | Contract Role |
|-------|------|-------|---------------|
| Frontend | `frontend/frontend-agent.md` | `apps/edge-extension/**` | Consumer |
| Backend | `backend/backend-agent.md` | `apps/api-server/**` | Publisher |

## Shared Policies

All agents must follow the shared policies in `shared/`:
- **Operating Model** — task lifecycle, collaboration rules, conflict resolution
- **Contract-First Policy** — how frontend and backend integrate through contracts
- **Repo Boundaries** — who owns what directories, cross-boundary rules

## Getting Started

1. Read `AGENTS.md` (this file)
2. Read your role-specific agent spec
3. Read the shared policies
4. Receive a task packet
5. Execute, validate, hand off
