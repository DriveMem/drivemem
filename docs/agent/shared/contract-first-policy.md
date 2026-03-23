# Contract-First Policy

## Principle

All frontend-backend integration must go through documented contracts.
No agent may invent, assume, or rely on undocumented API behavior.

## Contract Artifacts

| Artifact | Location | Authority |
|----------|----------|-----------|
| OpenAPI spec | `docs/contracts/openapi.yaml` | Backend Agent |
| Error model | `docs/contracts/error-model.md` | Backend Agent |
| Webhook events | `docs/contracts/webhook-events.md` | Backend Agent |
| Generated client | `packages/api-contract/generated/` | Auto-generated |
| Shared types | `packages/shared-types/` | Jointly maintained |

## Rules for Backend Agent (Publisher)

- Every new endpoint must be in `openapi.yaml` before or alongside implementation
- Contract changes must be backward-compatible unless an ADR approves breaking changes
- Error responses must follow the error model
- Regenerate `packages/api-contract/generated/` when contracts change

## Rules for Frontend Agent (Consumer)

- Never invent request or response fields
- Never assume undocumented status codes
- Never hardcode API behavior not in the spec
- If the contract is incomplete, implement UI shell only and document the gap

## When Contracts Are Incomplete

1. The requesting agent documents what is missing
2. The publishing agent (Backend) adds the contract
3. Types are regenerated
4. Implementation proceeds

No agent may skip this sequence by "guessing" what the contract should be.
