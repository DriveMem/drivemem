
## 1. Purpose

This document defines repository ownership boundaries, allowed edit scope, and escalation rules for multi-agent work.

Its goal is to make repository changes:
- clearly owned
- safe to review
- low-ambiguity across domains
- resilient to silent cross-boundary drift
- easy to hand off and verify

This document applies to all agents working in this repository unless a stricter local rule exists in a more specific agent document.

---

## 2. Boundary Principles

### 2.1 Ownership over convenience
Each directory or file group should have a primary owner.
Agents should prefer local changes inside their owned area, even if a cross-boundary change would feel faster.

### 2.2 Least-privilege edits
An agent should edit only the minimum set of files required to complete the scoped task.
Reading across boundaries for context is allowed.
Editing across boundaries is restricted.

### 2.3 Explicit contract surfaces
Cross-domain collaboration should happen through explicit contract surfaces such as:
- API schemas
- shared types
- interface definitions
- event/telemetry schemas
- documented integration points

If a change affects another domain but does not go through an explicit contract surface, it must be treated as higher risk.

### 2.4 Shared does not mean ownerless
A shared directory is not a free-edit zone.
Every shared area must still have a stewardship rule:
- joint ownership
- designated primary steward
- or explicit review requirements

### 2.5 No silent semantic changes
Non-owners must not silently change:
- business meaning
- API semantics
- validation behavior
- auth or permission behavior
- feature flags or defaults
- analytics definitions
- error semantics
- user-visible behavior owned by another domain

### 2.6 Boundary-sensitive changes must be reviewable
The more a change crosses domain boundaries, the more explicit it must be about:
- why the change is needed
- why it cannot stay local
- what behavior changed
- what follow-up is required
- how it was verified

### 2.7 No hidden context expansion
Agents should operate on the files, modules, docs, and resources explicitly relevant to the task.
Do not widen scope by opportunistically fixing unrelated issues in another domain.

---

## 3. Ownership Model

Each repository area should be classified using one of the following ownership models.

### 3.1 Primary owner
The domain that controls semantics, structure, and long-term maintenance of the area.

### 3.2 Secondary owner
A supporting domain that may contribute changes in limited cases, but does not control the area’s semantics.

### 3.3 Consumer
A domain that reads or integrates with the area but should not edit it except through approved mechanisms.

### 3.4 Shared steward
A defined owner or owner group for shared assets such as contracts, schemas, or cross-domain types.

---

## 4. Ownership Map

Replace the placeholder paths below with your actual repository paths.

| Path | Primary owner | Secondary owner | Non-owner edits allowed | Notes |
|---|---|---|---|---|
| `<frontend-root>/**` | Frontend | Backend (consumer) | Only thin integration glue, generated client updates, or tests directly required by an approved contract | UI semantics remain frontend-owned |
| `<backend-root>/**` | Backend | Frontend (consumer) | Only generated stubs, test fixtures, or integration wiring directly required by an approved contract | Domain logic and server semantics remain backend-owned |
| `<contract-root>/**` | Shared steward / Frontend + Backend | N/A | Yes, but requires contract-aware review | Source of truth for request/response schemas and interface contracts |
| `<shared-types-root>/**` | Shared steward | Frontend + Backend | Yes, with caution | Only neutral transport-safe shared types; no domain leakage |
| `<shared-ui-root>/**` | Frontend | Backend (consumer) | Usually no | Backend should not change UI primitives unless explicitly scoped |
| `<telemetry-root>/**` | Shared steward / Backend | Frontend | Yes, but schema changes require review by all impacted domains | Event names and field meanings are contract surfaces |
| `<e2e-root>/**` | Joint | Joint | Yes | E2E tests may be edited by either domain when scoped to the task |
| `<generated-root>/**` | Derived from source owner | N/A | Regenerate only | Do not hand-edit unless the repo explicitly allows it |

### 4.1 Default rule for unlisted paths
If a path is not listed here, the agent must not assume ownership.
Treat it as:
- unknown ownership
- requiring clarification
- or owned by the closest clearly defined parent boundary

### 4.2 Generated files
Generated artifacts inherit ownership from the source definitions that produce them.
Do not treat generated directories as independent ownership zones.

### 4.3 File moves and renames
Moving or renaming files across boundaries is a boundary change, not a cosmetic edit.
It requires owner awareness and justification.

---

## 5. Change Classes

Every code change should be classified before implementation.

### 5.1 Local change
Affects only one owned boundary and no shared contract.

Examples:
- frontend component behavior within frontend-owned files
- backend validation logic within backend-owned files
- tests inside the same owned area

### 5.2 Shared-surface change
Touches a shared contract or shared asset but does not materially change another domain’s owned logic.

Examples:
- adding an optional response field
- extending a shared type
- adding a telemetry field with agreed semantics

### 5.3 Cross-boundary integration change
One domain updates its area to consume an already approved contract from another domain.

Examples:
- frontend wiring to a backend endpoint that already exists
- backend supporting an agreed request shape used by frontend
- E2E coverage spanning both domains

### 5.4 Boundary-expanding change
Changes ownership assumptions, contract semantics, file locations, or another domain’s behavior.
This is the highest-risk category and requires explicit documentation.

Examples:
- changing API semantics in a way that affects existing consumers
- moving files across domain roots
- altering another domain’s feature defaults
- modifying shared event meanings used by analytics or reporting

---

## 6. Allowed Non-Owner Edits

Non-owner edits are allowed only when they are narrow, obvious, and necessary for the scoped task.

Allowed examples:
- updating generated API clients after an approved contract change
- adjusting imports or wiring to consume an existing interface
- adding or updating tests adjacent to the integration path
- fixing type mismatches caused by an agreed shared contract update
- adding small compatibility shims explicitly required for the integration
- updating documentation for a change already approved by the owning domain

These edits must remain:
- minimal
- local to the dependency chain
- non-semantic for the foreign domain
- easy to review in isolation

---

## 7. Disallowed Non-Owner Edits

Non-owners must not make the following changes unless the task explicitly authorizes them and the reason is documented.

### 7.1 Semantic changes in another domain
Examples:
- changing backend business rules from a frontend-driven task
- changing frontend user flows from a backend-driven task
- redefining validation rules, error messages, auth behavior, or feature defaults

### 7.2 Broad refactors across another boundary
Examples:
- reorganizing another domain’s files for readability
- renaming symbols across a foreign owned area for style consistency
- changing architecture patterns outside the scoped problem

### 7.3 Opportunistic fixes outside scope
Examples:
- bundling unrelated bug fixes into a contract update
- mixing cleanup work into a sensitive integration change
- “while I was here” edits in foreign owned files

### 7.4 Ownership laundering through shared folders
Examples:
- placing domain logic into a shared folder to bypass review
- using shared types to encode domain-specific behavior that belongs elsewhere

### 7.5 Direct edits to generated outputs
Do not hand-edit generated files unless the repository explicitly documents that workflow.

---

## 8. Rules for Shared Zones

### 8.1 Contracts and schemas
Anything under `<contract-root>` is a formal contract surface.
Changes here must specify:
- change type: additive / modifying / breaking
- affected consumers
- backward compatibility expectation
- migration or rollout requirement if any
- verification method

### 8.2 Shared types
Shared types should stay:
- minimal
- stable
- transport-oriented
- free of domain-only business logic

Do not turn shared types into a dumping ground for convenience abstractions.

### 8.3 Shared UI or design primitives
These remain frontend-owned unless explicitly stated otherwise.
Backend may consume documentation but should not redefine presentation semantics.

### 8.4 Telemetry and event schemas
Telemetry is a contract surface.
Do not change:
- event names
- field names
- field meanings
- cardinality assumptions
- success/failure definitions

without documenting downstream impact.

---

## 9. Cross-Boundary Exception Protocol

If an agent must edit another domain’s owned area, the change must include an explicit exception record.

### 9.1 Required exception record
The record must state:
- why the cross-boundary edit is necessary
- why a local-only change is insufficient
- exact files changed outside ownership
- whether the foreign-domain behavior changed semantically
- risks introduced
- what follow-up is needed from the owning domain
- how the change was verified

### 9.2 Scope rule
The exception should be as narrow as possible.
One justified cross-boundary edit does not authorize broad edits in the same area.

### 9.3 Handoff rule
If the change creates downstream work for the owning domain, a structured handoff is mandatory.

---

## 10. Review and Approval Routing

### 10.1 Owner review required
Owner review is required when a change:
- modifies a foreign owned file beyond thin wiring
- changes any shared contract
- alters telemetry semantics
- changes auth, permissions, validation, or feature defaults
- moves files across boundaries
- introduces or removes public interface fields

### 10.2 Joint review required
Frontend and backend review are both required when a change:
- affects request/response contracts
- changes shared types consumed by both
- alters end-to-end behavior spanning both domains
- modifies rollout assumptions or compatibility guarantees

### 10.3 No silent merge rule
A boundary-sensitive change must not be merged on the assumption that “the diff is obvious.”
If ownership or impact is ambiguous, review must be explicit.

---

## 11. Verification Requirements by Change Class

### 11.1 Local changes
Minimum:
- domain-relevant tests or manual verification
- acceptance criteria check
- no known regression intentionally introduced without disclosure

### 11.2 Shared-surface changes
Minimum:
- contract validation
- impacted consumer check
- additive vs breaking classification
- documentation of compatibility expectations

### 11.3 Cross-boundary integration changes
Minimum:
- integration verification across both domains
- happy path check
- at least one failure/edge case check
- handoff or completion note for downstream consumers

### 11.4 Boundary-expanding changes
Minimum:
- explicit risk note
- owner review
- rollback or mitigation note where relevant
- end-to-end validation evidence
- confirmation that the new boundary is intentional

---

## 12. Documentation Expectations

Boundary-sensitive changes must leave enough evidence so another agent can understand the change without reconstructing intent from diffs alone.

Expected documentation may include:
- task packet references
- contract notes
- handoff notes
- migration notes
- verification steps
- screenshots or API examples where appropriate

---

## 13. Anti-Patterns

The following are considered repository-boundary failures:

- editing foreign owned files because it was faster
- treating shared folders as no-owner territory
- mixing unrelated cleanup into a boundary-sensitive change
- shipping contract changes without consumer impact notes
- hand-editing generated artifacts without approval
- moving files across domain roots without calling it out
- changing another domain’s semantics under the label of “integration”
- expecting reviewers to infer ownership and risk from the diff

---

## 14. Minimal Boundary Checklist

Before implementation:
- Is the target path owned by my domain?
- If not, is my edit explicitly allowed?
- Am I touching a contract surface?

Before opening or handing off work:
- Did I identify every foreign-owned file touched?
- Did I explain why each cross-boundary edit was necessary?
- Did I classify the change correctly?

Before completion:
- Did the right owner(s) review the change?
- Did I verify contract and integration behavior where needed?
- Did I document downstream impact and follow-up work?

---

## 15. Relationship to Other Docs

This document defines repository ownership and cross-boundary edit rules.

Related documents:
- `docs/agent/shared/operating-model.md` defines collaboration flow and handoff model
- `docs/agent/shared/contract-first-policy.md` defines how contracts are proposed, changed, and reviewed
- domain-specific agent docs define execution rules within each domain
- task packet templates define intake structure
- handoff templates define downstream transfer format
- Definition of Done documents define completion quality bars