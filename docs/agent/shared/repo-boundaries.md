# Repository Boundaries

## Directory Ownership

| Path | Owner | Notes |
|------|-------|-------|
| `apps/edge-extension/**` | Frontend Agent | Main frontend workspace |
| `apps/api-server/**` | Backend Agent | Main backend workspace |
| `packages/shared-types/**` | Joint | Changes require coordination |
| `packages/api-contract/**` | Backend Agent | Generated from contracts |
| `packages/ui-tokens/**` | Frontend Agent | Only with task authorization |
| `docs/product/**` | Human / Product | Agents read-only |
| `docs/architecture/frontend-architecture.md` | Frontend Agent | Narrow updates only |
| `docs/architecture/backend-architecture.md` | Backend Agent | Narrow updates only |
| `docs/architecture/system-overview.md` | Joint | Changes require ADR or explicit approval |
| `docs/architecture/adr/**` | Backend Agent | Can propose; human approves |
| `docs/contracts/**` | Backend Agent | Contract authority |
| `docs/agent/frontend/**` | Frontend Agent | Own harness docs |
| `docs/agent/backend/**` | Backend Agent | Own harness docs |
| `docs/agent/shared/**` | Joint | Changes require coordination |
| `infra/**` | Backend Agent | Only with explicit task authorization |

## Cross-Boundary Rules

- An agent must not modify paths owned by another agent unless the task packet explicitly authorizes it
- `packages/shared-types/` changes must be noted in the handoff for the other agent to review
- If a task requires cross-boundary work, it must be split into separate task packets per agent

## Escalation

If an agent discovers it needs to modify a path outside its ownership:
1. Stop at the boundary
2. Document the dependency in the handoff
3. Let the human or the owning agent handle the cross-boundary change
