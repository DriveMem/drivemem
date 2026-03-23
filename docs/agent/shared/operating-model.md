# Multi-Agent Operating Model

## 1. Purpose

This document defines how agents collaborate in this repository.

The goal is to make work:
- contract-driven
- reviewable
- low-ambiguity
- safe across frontend and backend boundaries
- easy to hand off without hidden assumptions

This operating model is the default collaboration protocol for all agents unless a task explicitly defines a stricter workflow.

---

## 2. Design Principles

### 2.1 Contract first
Agents should align on interface, data shape, and behavior before implementing coupled work.

### 2.2 Clear ownership
Each agent should primarily modify files and logic within its owned boundary.

### 2.3 Small, reviewable increments
Prefer smaller deliverables with explicit scope over large cross-cutting changes.

### 2.4 Explicit handoff
If another agent depends on your output, produce a structured handoff rather than relying on implicit context.

### 2.5 No silent assumptions
If behavior, API shape, error handling, loading states, or fallback behavior is not defined, the agent must mark it explicitly as:
- assumed
- proposed
- blocked
- out of scope

### 2.6 Safe cross-boundary changes
No agent should introduce breaking cross-boundary changes without documenting:
- what changed
- why it changed
- who is affected
- what downstream work is required

### 2.7 Validate before claim
No work is considered complete until it passes the relevant Definition of Done.

---

## 3. Agent Roles

### 3.1 Frontend Agent

Owns:
- user interface implementation
- page / component behavior
- client-side state management
- rendering logic
- interaction flows
- loading / empty / error states on the client
- integration of approved backend contracts

Does not own:
- backend business rules
- database schema
- server-side auth / permission logic
- API semantics that have not been agreed through contract

### 3.2 Backend Agent

Owns:
- API design and implementation
- server-side business logic
- database / persistence changes
- auth / permission enforcement
- data validation on the server
- reliability, performance, and observability of backend behavior

Does not own:
- UI behavior decisions
- presentation logic
- client-only interaction details
- frontend state management choices unless contract-relevant

### 3.3 Shared Responsibility

Frontend and backend agents jointly own:
- contract clarity
- backward compatibility expectations
- integration risk visibility
- end-to-end acceptance criteria
- release readiness for cross-boundary features

---

## 4. Sources of Truth

For any task, agents should use the following order of precedence:

1. Approved product / feature requirements
2. Shared collaboration policies under `docs/agent/shared/`
3. Domain-specific agent docs under `docs/agent/frontend/` or `docs/agent/backend/`
4. Task packet for the specific task
5. Existing implementation and repository conventions

If these conflict:
- the task must be paused at the smallest possible scope
- the conflict must be documented explicitly
- the agent must not “guess and continue” on a contract-impacting decision

---

## 5. Standard Delivery Flow

### 5.1 Intake

Every task should start with a task packet that includes:
- background
- goal
- scope
- non-goals
- dependencies
- contract impact
- acceptance criteria
- verification expectations

If any of these are missing, the receiving agent should document the gap before implementation.

### 5.2 Classification

The receiving agent should classify the task as one of the following:

### A. Local task
Only affects one owned area and no shared contract.

### B. Integration task
Affects one owned area but depends on an existing contract with another area.

### C. Contract-change task
Changes or creates a shared contract and therefore requires alignment before implementation.

### D. Cross-boundary task
Requires coordinated frontend and backend changes with explicit sequencing or parallelization.

### 5.3 Contract Check

Before implementation, determine whether the task:
- uses an existing contract as-is
- clarifies an ambiguous contract
- extends an existing contract
- introduces a new contract
- breaks an existing contract

If the contract is unclear, agents should align on:
- request/response shape
- field names and meanings
- nullability / optionality
- loading and error semantics
- empty-state behavior
- backward compatibility expectations
- versioning or migration expectations if applicable

### 5.4 Planning

After contract check, the agent should define:
- what will be changed now
- what will not be changed now
- whether work can proceed in parallel
- what dependency or handoff is needed
- what verification is required before completion

### 5.5 Implementation

Agents should:
- stay within owned boundaries as much as possible
- keep changes minimal and coherent
- avoid speculative refactors unless task-required
- avoid hidden contract changes
- document assumptions in the handoff or task notes

### 5.6 Validation

Before handoff or completion, validate:
- functional correctness
- acceptance criteria coverage
- contract conformance
- relevant tests or manual verification
- no known critical regression introduced intentionally without disclosure

### 5.7 Handoff / Completion

If downstream work is required, produce a handoff.
If no downstream work is required, mark the task complete with evidence.

---

## 6. Handoff Rules

A handoff is required when:
- another agent must continue the task
- a dependency is now unblocked
- a contract has been implemented or changed
- the next step depends on hidden context that is not obvious from the diff alone

A good handoff must include:
- what was completed
- exact files / modules changed
- contract used or updated
- assumptions made
- known gaps or risks
- what the next agent must do
- how to verify the integration

A handoff should be understandable without requiring the next agent to reconstruct intent from commit history.

---

## 7. Cross-Boundary Change Rules

An agent may read across boundaries freely for context, but should be cautious when modifying another domain.

### Allowed with care
- small interface wiring updates
- shared type synchronization
- low-risk integration glue
- test adjustments required by the approved contract

### Not allowed without explicit justification
- changing another domain’s ownership model
- altering business semantics from the other side
- introducing undocumented breaking changes
- broad refactors in another domain to make local work easier
- fixing unrelated issues outside scope during a cross-boundary task

If cross-boundary edits are necessary, the agent must document:
- why the edit was needed
- why it could not stay local
- what behavior changed
- what follow-up is expected from the owning domain

---

## 8. Decision Rules

When multiple implementation options exist, prefer the option that is:

1. consistent with existing contracts and patterns
2. easiest to review safely
3. least likely to create downstream ambiguity
4. easiest to verify end-to-end
5. easiest to extend later without breaking consumers

Agents should avoid optimizing prematurely for abstraction if the task only requires a focused delivery.

---

## 9. Communication Rules

Agents should communicate in a way that is:
- explicit
- bounded by scope
- implementation-relevant
- testable

Agents should avoid:
- vague statements like “done” without evidence
- undocumented assumptions
- ambiguous ownership language
- mixing shipped behavior with proposed future work

Preferred language patterns:
- “Implemented”
- “Proposed”
- “Assumed”
- “Blocked by”
- “Out of scope”
- “Needs contract decision”
- “Ready for frontend integration”
- “Ready for backend integration”
- “Ready for verification”

---

## 10. Risk Management

The agent should explicitly call out risks when a task involves:
- API contract changes
- migrations
- auth / permissions
- async state or eventual consistency
- performance-sensitive paths
- telemetry / analytics semantics
- error-state ambiguity
- backward compatibility concerns

Risk disclosure should include:
- risk description
- impact area
- likelihood if known
- mitigation or fallback
- validation plan

---

## 11. Verification Expectations

Every task should include a verification section.

Depending on scope, verification may include:
- unit tests
- integration tests
- API examples
- screenshots
- manual test steps
- edge-case validation
- regression checklist

If a task is not fully verified, the agent must say exactly what was and was not verified.

---

## 12. Completion Criteria

A task is complete only when:
- scoped implementation is finished
- acceptance criteria are addressed
- contract expectations are met
- assumptions are documented
- downstream dependency is either handed off or resolved
- verification evidence is provided
- remaining gaps are explicitly labeled as non-goals, follow-ups, or risks

---

## 13. Anti-Patterns

The following are considered process failures:

- implementing before clarifying contract-impacting ambiguity
- silently changing API semantics
- handing off work without next-step instructions
- claiming completion without validation
- making broad out-of-scope refactors
- pushing unresolved ambiguity onto the next agent without documentation
- using shared docs as aspirational guidance instead of executable working rules

---

## 14. Minimal Operating Checklist

Before starting:
- Is the scope clear?
- Is ownership clear?
- Is contract impact clear?

Before handoff:
- Did I document what changed?
- Did I document assumptions and risks?
- Did I say exactly what the next agent should do?

Before completion:
- Did I validate against Definition of Done?
- Did I provide verification evidence?
- Did I clearly mark anything not done?

---

## 15. Relationship to Other Docs

This document defines the collaboration model.

Related documents:
- `shared/repo-boundaries.md` defines ownership and change boundaries
- `shared/contract-first-policy.md` defines how contracts are proposed, changed, and reviewed
- domain-specific agent docs define execution behavior within each domain
- task packet templates define task intake structure
- handoff templates define downstream transfer format
- definition-of-done docs define quality bars for completion