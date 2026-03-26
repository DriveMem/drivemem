
## Purpose

This directory defines the operating rules for multi-agent collaboration in this repository.

It exists to make work:
- scoped
- contract-aware
- reviewable
- safe across ownership boundaries
- easy to hand off
- easy to verify before completion

This file is the top-level entry point for agent guidance under `docs/agent/`.

It should stay concise.
General rules belong here.
More specific rules belong in the closest relevant subdirectory document.

---

## How to Use These Docs

When working on a task, follow this order:

1. Read the relevant product / feature requirements
2. Read the shared collaboration docs under `shared/`
3. Read the domain-specific docs under `frontend/` or `backend/`
4. Use the relevant task packet template before implementation
5. Use the relevant handoff template if another owner must act next
6. Check the relevant Definition of Done before claiming completion

Do not skip domain-specific guidance when the task is domain-specific.

---

## Guidance Precedence

Follow guidance in this general order:

1. Approved product / feature requirements
2. Shared docs under `docs/agent/shared/`
3. The closest domain-specific agent doc
4. The task packet for the specific task
5. Existing repository conventions and implementation patterns

If guidance conflicts:
- do not guess on contract-impacting or safety-sensitive behavior
- pause at the smallest possible scope
- document the conflict explicitly
- continue only where the safe path is unambiguous

More specific guidance closer to the relevant working area should be treated as more authoritative than broader guidance, unless it conflicts with higher-level approved requirements.

---

## Directory Structure

### Shared collaboration rules
- `docs/agent/shared/operating-model.md`
- `docs/agent/shared/repo-boundaries.md`
- `docs/agent/shared/contract-first-policy.md`

These documents define:
- how agents collaborate
- who owns which areas
- how contract changes are proposed, reviewed, and verified

### Frontend domain docs
- `docs/agent/frontend/frontend-agent.md`
- `docs/agent/frontend/frontend-agent.zh-CN.md`
- `docs/agent/frontend/task-packet-template.md`
- `docs/agent/frontend/handoff-template.md`
- `docs/agent/frontend/definition-of-done.md`
- `docs/agent/frontend/tasks/` — active task packets

These documents define:
- frontend role and execution rules
- frontend task intake
- frontend handoff expectations
- frontend completion criteria

### Backend domain docs
- `docs/agent/backend/backend-agent.md`
- `docs/agent/backend/backend-agent.zh-CN.md`
- `docs/agent/backend/task-packet-template.md`
- `docs/agent/backend/handoff-template.md`
- `docs/agent/backend/definition-of-done.md`
- `docs/agent/backend/tasks/` — active task packets

These documents define:
- backend role and execution rules
- backend task intake
- backend handoff expectations
- backend completion criteria

---

## Core Working Principles

### 1. Contract first
If work crosses boundaries, align on the contract before implementing tightly coupled behavior.

### 2. Respect ownership
Stay within owned boundaries whenever possible.
Cross-boundary edits must be minimal, justified, and documented.

### 3. Keep work reviewable
Prefer small, coherent, reviewable increments over broad mixed changes.

### 4. No silent assumptions
If something is unclear, label it explicitly as:
- proposed
- assumed
- blocked
- out of scope
- needs decision

### 5. No silent semantic changes
Changing meaning without changing shape is still a contract change.
Do not silently change:
- field meaning
- error semantics
- auth behavior
- retry behavior
- defaults
- analytics semantics
- user-visible behavior in another domain

### 6. Handoff is part of delivery
If another owner must continue, produce a structured handoff.
Do not rely on diffs or chat history as the only transfer mechanism.

### 7. Verification is required
Work is not done because it “should work.”
Verification must be documented.
Anything not verified must also be documented.

### 8. Keep docs practical
These docs are working instructions, not aspirational process writing.
When recurring mistakes appear, update the nearest relevant document.

---

## Standard Collaboration Flow

### 1. Intake
Start from a task packet.

At minimum, the task should define:
- goal
- scope
- non-goals
- dependencies
- contract impact
- acceptance criteria
- verification expectations

### 2. Classification
Classify the task before implementation.

Common classes:
- local task
- integration task
- contract-change task
- migration / data-shape task
- risk-sensitive task

### 3. Contract check
Determine whether the task:
- uses an existing contract as-is
- clarifies a contract
- extends a contract
- introduces a new contract
- breaks an existing contract

### 4. Implementation
Implement the smallest safe change that satisfies the scoped task.

### 5. Verification
Validate behavior proportionate to task risk.

### 6. Handoff or completion
If another owner must act next, produce a handoff.
If not, leave a clear completion note with evidence.

---

## Required Documents by Situation

### If the task is frontend-owned
Use:
- `docs/agent/frontend/frontend-agent.md`
- `docs/agent/frontend/task-packet-template.md`
- `docs/agent/frontend/handoff-template.md`
- `docs/agent/frontend/definition-of-done.md`
- `docs/agent/frontend/tasks/` — active task packets

### If the task is backend-owned
Use:
- `docs/agent/backend/backend-agent.md`
- `docs/agent/backend/task-packet-template.md`
- `docs/agent/backend/handoff-template.md`
- `docs/agent/backend/definition-of-done.md`
- `docs/agent/backend/tasks/` — active task packets

### If the task crosses frontend and backend
Always read:
- `docs/agent/shared/operating-model.md`
- `docs/agent/shared/repo-boundaries.md`
- `docs/agent/shared/contract-first-policy.md`

Then use the domain-specific docs for the side you are actively changing.

---

## Minimum Expectations Before Claiming Completion

Do not mark work complete unless all applicable items are true:

- scoped work is implemented
- acceptance criteria are addressed
- ownership boundaries are respected
- contract assumptions are explicit
- risks and blockers are visible
- verification performed is documented
- verification not performed is documented
- downstream handoff exists if another owner must act next
- completion level is labeled accurately

Possible completion labels:
- Production-complete
- Ready for integration
- Ready for verification
- Partial completion
- Prototype / spike

Do not overstate completion.

---

## Anti-Patterns

The following are process failures:

- implementing across boundaries without checking contract impact
- silently changing semantics in another domain
- treating shared directories as ownerless
- bundling unrelated cleanup into boundary-sensitive work
- claiming “done” without verification evidence
- handing off work without clear next steps
- relying on chat history instead of structured handoff
- leaving assumptions implicit
- using “minor change” to describe consumer-impacting behavior

---

## Maintenance Rule

Keep this file short and durable.

Add guidance here only if it should apply broadly across this repository’s agent workflow.

If a rule applies only to one domain or one directory:
- put it in the closer domain-specific document instead

When an agent makes the same mistake more than once:
- update the nearest relevant guidance document
- prefer practical corrections over abstract principles

---

## Relationship to Other Docs

This file is the entry point and top-level coordination guide for `docs/agent/`.

Detailed rules live in:
- `docs/agent/shared/` for collaboration, boundaries, and contract policy
- `docs/agent/frontend/` for frontend-specific execution, handoff, and completion standards
- `docs/agent/backend/` for backend-specific execution, handoff, and completion standards