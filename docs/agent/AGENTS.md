# Agent Operating Rules

## Directory Structure

```
docs/agent/
├── AGENTS.md                      # This file — agent harness overview
├── frontend-agent.md              # Frontend Agent formal spec (English)
├── frontend-agent.zh-CN.md        # Frontend Agent explanation (Chinese)
├── backend-agent.md               # Backend Agent formal spec (English)
├── backend-agent.zh-CN.md         # Backend Agent explanation (Chinese)
├── task-packet-template.md        # Task packet template for all agents
├── handoff-template.md            # Handoff output template
├── definition-of-done.md          # Shared Definition of Done checklist
└── tasks/                         # Active and completed task packets
```

## Agents

### Frontend Agent
- **Spec:** `frontend-agent.md`
- **Role:** Edge extension frontend implementation
- **Scope:** `apps/edge-extension/**`, UI components, frontend state, API client consumption
- **Contract relationship:** Consumer (reads contracts, does not define them)

### Backend Agent
- **Spec:** `backend-agent.md`
- **Role:** API server, storage, auth, AI services, database
- **Scope:** `apps/api-server/**`, database, infra (when authorized)
- **Contract relationship:** Publisher (defines and maintains OpenAPI contracts)

## Collaboration Model

Agents collaborate through **documented artifacts only**:
- OpenAPI contract (`docs/contracts/openapi.yaml`)
- Error model (`docs/contracts/error-model.md`)
- Generated client/types (`packages/api-contract/generated/`)
- Shared types (`packages/shared-types/`)
- Handoff notes

Agents do **not** collaborate through assumptions, verbal agreements, or undocumented behavior.

## Conflict Resolution

When sources conflict, follow this priority:
1. Approved ADR
2. OpenAPI / contract docs
3. Architecture docs (frontend or backend)
4. Task packet
5. Existing implementation

## Task Workflow

1. A task packet is created using `task-packet-template.md`
2. The assigned agent reads its spec + task packet + relevant docs
3. The agent implements within allowed paths
4. The agent validates using the specified commands
5. The agent produces a handoff using `handoff-template.md`
6. The task is assessed against `definition-of-done.md`

## Tasks Directory

Active and completed task packets live in `docs/agent/tasks/`.
Naming convention: `<TASK-ID>-<short-title>.md` (e.g., `FE-001-file-list-ui.md`)
