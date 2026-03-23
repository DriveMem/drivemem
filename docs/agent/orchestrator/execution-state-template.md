
## Purpose

Use this template to maintain the current execution state of a product area, feature stream, or delivery plan.

This template helps the Product Orchestrator Agent:
- keep multi-agent execution state visible
- preserve continuity across planning and implementation rounds
- track what is planned, active, blocked, handed off, and done
- avoid re-deriving status from chat history, diffs, or memory
- identify the correct next step and next owner
- keep assumptions, decisions, and risks attached to live execution state

This is not a generic project status template.

It is an execution-control template for orchestrated multi-agent delivery.

---

## When to Use This Template

Use this template when:
- a product or feature has moved beyond intake
- decomposition has produced slices or task packets
- work is being dispatched across frontend, backend, and shared owners
- handoffs are happening across specialist agents
- blockers, decisions, and sequencing need to be tracked explicitly
- the orchestrator needs a current state snapshot before planning the next move

Use this template as:
- the current source of execution truth for the orchestrator layer
- the state checkpoint after each significant planning or implementation handoff
- the continuity layer between one execution round and the next

---

## Execution State Output Standard

A useful execution state should make the following immediately visible:

1. What product area or slice this state covers
2. What is currently in scope
3. What is planned
4. What is active
5. What is blocked
6. What has been handed off
7. What is done
8. What decisions are still open
9. What assumptions are currently in force
10. What should happen next, by whom, and why

If these are not visible, the execution state is not useful.

---

## Execution State Rules

### 1. State must reflect execution, not aspiration
Do not list work as active, ready, or done unless that status is real.

### 2. Preserve continuity
The execution state should let a new planning round start without reconstructing prior logic from memory.

### 3. Keep status bounded and explicit
Every tracked item should have:
- a clear owner
- a clear status
- a clear next step
- a clear blocker if blocked

### 4. Preserve assumptions and decisions
If execution depends on an assumption, keep it attached to the state until it is resolved or replaced.

### 5. Keep scope stable
Do not let execution state become a dumping ground for unrelated future ideas.

### 6. Distinguish blocked from not started
A blocked item is not the same as an item that simply has not started.

### 7. Distinguish handed off from done
A handoff means ownership has moved.
It does not automatically mean the work is complete.

### 8. Keep the next move obvious
At any point, the execution state should make it easy to answer:
- what should happen next
- who should do it
- what input they should use
- what output they should return

---

## Execution State Template

# Execution State

## 1. State Metadata

- **Feature / product area**:
- **State owner**:
- **Last updated**:
- **Planning stage**:
  - [ ] Intake
  - [ ] Product framing
  - [ ] Capability decomposition
  - [ ] Slice planning
  - [ ] Task dispatch
  - [ ] Active execution
  - [ ] Replanning
  - [ ] Verification / release preparation
- **Current execution phase**:
  - [ ] Early planning
  - [ ] First slice execution
  - [ ] Multi-slice execution
  - [ ] Blocked / decision-bound
  - [ ] Stabilization
  - [ ] Completed for current scope
- **Related docs / links**:
- **Related planning artifacts**:
- **Related task packets**:
- **Related handoffs**:

### Current execution summary
Summarize in 3–6 lines:
- what this state covers
- what stage the work is in
- what the most important current movement is
- what the main constraint or risk is right now

---

## 2. Current Scope Snapshot

Record only the scope currently being actively managed.

### In current scope
- 
- 
- 

### Explicitly out of current scope
- 
- 
- 

### Deferred for later
- 
- 
- 

### Scope stability
- [ ] Stable
- [ ] Mostly stable
- [ ] Still shifting
- [ ] Blocked by unresolved product direction

### Scope notes
- 
- 
- 

This section prevents state drift.

---

## 3. Current Product / Delivery Frame

Preserve the current working frame that execution is following.

### Problem being solved
- 
- 
- 

### Primary target user or consumer
- 
- 
- 

### Current v1 or current-phase goal
- 
- 
- 

### Current success criteria
- 
- 
- 

### Notes
- 
- 
- 

This should reflect the currently active frame, not every historical version.

---

## 4. Active Assumptions

Track assumptions that are still live in execution.

### Assumptions currently in force
For each assumption include:
- **Assumption**:
- **Why it is currently acceptable**:
- **What changes if it is wrong**:
- **Owner to revisit**:

Example:

- **Assumption**: AI Drive v1 is extension-first.
  - **Why it is currently acceptable**: Current first slice depends on extension entry and search flow.
  - **What changes if it is wrong**: Slice priority and task routing would need to be replanned.
  - **Owner to revisit**: Product Orchestrator Agent / human product owner

- **Assumption**:
  - **Why it is currently acceptable**:
  - **What changes if it is wrong**:
  - **Owner to revisit**:

If none:
> None.

---

## 5. Open Decisions

Track decisions that are not yet resolved.

### Open decisions
For each decision include:
- **Decision**:
- **Why it matters**:
- **Current default assumption if any**:
- **Decision owner**:
- **Blocks what**:
- **Deadline or urgency if relevant**:

Example:

- **Decision**: Should clicking a search result open the file immediately in v1?
  - **Why it matters**: It changes frontend scope and result interaction semantics.
  - **Current default assumption if any**: Placeholder click behavior is acceptable for first slice.
  - **Decision owner**: Human product owner
  - **Blocks what**: Final interaction polish, not initial backend search work
  - **Deadline or urgency if relevant**: Before frontend completion

- **Decision**:
  - **Why it matters**:
  - **Current default assumption if any**:
  - **Decision owner**:
  - **Blocks what**:
  - **Deadline or urgency if relevant**:

If none:
> None.

---

## 6. Execution Board

Track work items by execution state.

Recommended states:
- Planned
- Ready to dispatch
- Active
- Handed off
- Blocked
- Awaiting decision
- Done
- Deferred

### 6.1 Planned
Work that is recognized but not yet ready for dispatch.

| Item | Type | Owner | Depends on | Next step | Notes |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

### 6.2 Ready to Dispatch
Work that is execution-ready and should likely be handed to a specialist agent next.

| Item | Type | Target owner | Required inputs | Expected output | Notes |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

### 6.3 Active
Work currently being executed by an owner.

| Item | Type | Current owner | Started when | Current status | Risks / notes |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

### 6.4 Handed Off
Work transferred to another owner and waiting for a return artifact.

| Item | From | To | Handoff artifact | Waiting for | Notes |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

### 6.5 Blocked
Work that cannot proceed until something specific changes.

| Item | Blocker | Owner to resolve | Work can continue elsewhere? | Notes |
|---|---|---|---|---|
|  |  |  |  |  |

### 6.6 Awaiting Decision
Work that depends on a product, contract, or ownership decision.

| Item | Decision needed | Decision owner | Temporary assumption | Notes |
|---|---|---|---|---|
|  |  |  |  |  |

### 6.7 Done
Work completed for the currently defined scope.

| Item | Owner | Completion artifact | Verified? | Notes |
|---|---|---|---|---|
|  |  |  |  |  |

### 6.8 Deferred
Work intentionally pushed out of the current execution window.

| Item | Why deferred | Revisit when | Notes |
|---|---|---|---|
|  |  |  |  |

---

## 7. Current Slice Status

Track execution by slice, not just by individual task.

### Slice status
For each slice include:
- **Slice name**:
- **Status**:
  - [ ] Draft
  - [ ] Planned
  - [ ] Ready to dispatch
  - [ ] Active
  - [ ] Blocked
  - [ ] Partially complete
  - [ ] Done for current scope
- **Goal**:
- **Current owner or orchestrator**:
- **Included task packets**:
- **Main blocker or risk**:
- **Likely next step**:

Example:

- **Slice name**: Drive Search v1
  - **Status**:
    - [ ] Draft
    - [ ] Planned
    - [x] Ready to dispatch
    - [ ] Active
    - [ ] Blocked
    - [ ] Partially complete
    - [ ] Done for current scope
  - **Goal**: Let users search drive files from the extension and see basic results.
  - **Current owner or orchestrator**: Product Orchestrator Agent
  - **Included task packets**:
    - `backend/tasks/task-drive-search-api-v1.md`
    - `frontend/tasks/task-drive-search-entry-v1.md`
  - **Main blocker or risk**: Search response semantics still partially assumed.
  - **Likely next step**: Dispatch backend task packet first.

- **Slice name**:
  - **Status**:
    - [ ]
    - [ ]
    - [ ]
    - [ ]
    - [ ]
    - [ ]
    - [ ]
  - **Goal**:
  - **Current owner or orchestrator**:
  - **Included task packets**:
  - **Main blocker or risk**:
  - **Likely next step**:

---

## 8. Dependency Snapshot

Keep a concise dependency map attached to the live state.

### Hard dependencies
- 
- 
- 

### Soft dependencies
- 
- 
- 

### Contract dependencies
- 
- 
- 

### Human decision dependencies
- 
- 
- 

### Notes
- 
- 
- 

This section should help the orchestrator avoid dispatching work out of sequence.

---

## 9. Contract and Shared-State Snapshot

Keep currently active contract-sensitive items visible.

### Active contract-sensitive items
For each item include:
- **Area**:
- **Current state**:
  - [ ] Confirmed
  - [ ] Assumed
  - [ ] Needs decision
  - [ ] Blocked
- **Producer**:
- **Consumer**:
- **Impact on execution**:
- **Next action**:

Example:

- **Area**: Drive Search response semantics
  - **Current state**:
    - [ ] Confirmed
    - [x] Assumed
    - [ ] Needs decision
    - [ ] Blocked
  - **Producer**: Backend
  - **Consumer**: Frontend
  - **Impact on execution**: Frontend task can be drafted but should not be finalized without backend confirmation.
  - **Next action**: Backend returns contract proposal or implementation handoff.

- **Area**:
  - **Current state**:
    - [ ]
    - [ ]
    - [ ]
    - [ ]
  - **Producer**:
  - **Consumer**:
  - **Impact on execution**:
  - **Next action**:

If none:
> None.

---

## 10. Risk Watchlist

Track only live risks that affect current execution.

### Live risks
For each risk include:
- **Risk**:
- **Category**:
  - [ ] Scope
  - [ ] Contract
  - [ ] Auth / permission
  - [ ] Interaction
  - [ ] Data source
  - [ ] Sequencing
  - [ ] Ownership
  - [ ] Operational
- **Current impact**:
- **Affected work items or slices**:
- **Mitigation / fallback**:
- **Owner**:

Example:

- **Risk**: Backend metadata source may not guarantee all fields frontend expects.
  - **Category**:
    - [ ] Scope
    - [x] Contract
    - [ ] Auth / permission
    - [ ] Interaction
    - [x] Data source
    - [ ] Sequencing
    - [ ] Ownership
    - [ ] Operational
  - **Current impact**: Search UI cannot finalize fallback behavior until field guarantees are explicit.
  - **Affected work items or slices**: Drive Search v1
  - **Mitigation / fallback**: Tighten required fields or define UI fallback.
  - **Owner**: Backend + Frontend

- **Risk**:
  - **Category**:
    - [ ]
    - [ ]
    - [ ]
    - [ ]
    - [ ]
    - [ ]
    - [ ]
    - [ ]
  - **Current impact**:
  - **Affected work items or slices**:
  - **Mitigation / fallback**:
  - **Owner**:

If none:
> None.

---

## 11. Recent Changes Since Last Update

Keep state evolution visible.

### Newly completed
- 
- 
- 

### Newly active
- 
- 
- 

### Newly blocked
- 
- 
- 

### Newly resolved decisions
- 
- 
- 

### Assumptions changed
- 
- 
- 

### Scope changes
- 
- 
- 

This section should make replanning easier.

---

## 12. Recommended Next Move

This is the most important forward-looking section.

### Immediate next action
- 
- 
- 

### Recommended next owner
- [ ] Product Orchestrator Agent
- [ ] Frontend
- [ ] Backend
- [ ] Shared / Contract owner
- [ ] QA
- [ ] Reviewer
- [ ] Release owner
- [ ] Human product owner
- [ ] Other

### Why this should happen next
- 
- 
- 

### Required input for the next owner
- 
- 
- 

### Expected return artifact
- 
- 
- 

### What should not happen yet
- 
- 
- 

This section should make the next handoff obvious.

---

## 13. Execution Health Assessment

Give a concise assessment of delivery health.

### Current health
- [ ] Healthy
- [ ] Healthy with visible risks
- [ ] Slowed by ambiguity
- [ ] Blocked by decision
- [ ] Blocked by dependency
- [ ] Needs replanning

### Why
- 
- 
- 

### What would improve execution health most
- 
- 
- 

This is not a vanity status.
It should be actionable.

---

## 14. Execution State Completion Statement

Use one of the following and keep only the applicable one.

### Option A — State is current and actionable
> This execution state is current and actionable. The next owner, next move, active assumptions, and active blockers are explicit.

### Option B — State is current but requires decision
> This execution state is current, but further execution depends on the open decisions or blockers documented above.

### Option C — State needs refresh
> This execution state is incomplete or stale and should not be used as the sole source of execution truth until refreshed.

---

## 15. Execution State Quality Checklist

Before treating this execution state as current, confirm:

- [ ] I made current scope explicit
- [ ] I preserved the current product/delivery frame
- [ ] I kept live assumptions visible
- [ ] I kept open decisions visible
- [ ] I separated planned / active / blocked / handed off / done / deferred
- [ ] I kept slice-level status visible
- [ ] I preserved contract-sensitive state
- [ ] I preserved live risks
- [ ] I recorded recent changes since the last update
- [ ] I made the next move and next owner explicit
- [ ] Another orchestrator or specialist agent could continue from this state without reconstructing context from chat history