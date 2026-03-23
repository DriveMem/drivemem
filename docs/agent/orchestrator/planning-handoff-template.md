
## Purpose

Use this template when the Product Orchestrator Agent is ready to hand planning output to:
- frontend
- backend
- shared / contract owner
- reviewer
- QA
- release owner
- human decision-maker

A planning handoff is not a generic summary.
It is an execution handoff.

Its purpose is to transfer enough planning context so the next owner can act without reconstructing:
- scope
- product intent
- sequencing logic
- contract assumptions
- dependencies
- blocked decisions
- expected output

A good planning handoff should preserve execution continuity across specialist agents.

---

## When to Use This Template

Use this template when any of the following is true:

- a product request has been clarified enough to begin implementation work
- decomposition has identified an execution-ready slice
- one or more task packets are ready to be dispatched
- a downstream domain agent should start work from planning output
- the next step depends on preserving planning assumptions and boundaries
- work should move from orchestrator-layer planning into domain execution

Do not use this template for:
- vague brainstorming
- raw notes with no ownership
- implementation handoffs between specialist agents
- generic status updates with no actionability

---

## Planning Handoff Output Standard

A completed planning handoff should preserve:

1. What is being handed off
2. Why this work should happen now
3. What scope is included and excluded
4. Which assumptions and contract expectations remain in force
5. Which dependencies and blockers matter
6. What the receiver must do next
7. What output the receiver must return
8. What would count as a successful handoff outcome

If these are not clear, the handoff is not complete.

---

## Planning Handoff Rules

### 1. Hand off execution-ready work, not planning noise
Only include planning detail that the receiver needs to act safely and correctly.

### 2. Preserve scope boundaries
Do not let product framing expand into unbounded implementation scope during handoff.

### 3. Preserve contract assumptions explicitly
If downstream work depends on a contract assumption, write it down.
Do not rely on chat history or implied memory.

### 4. Preserve sequencing logic
The receiver should understand:
- why this is the next task
- what it depends on
- what it unlocks next

### 5. Preserve ownership boundaries
Make clear what the receiver owns and what they must not silently redefine.

### 6. Preserve open decisions
Do not hide unresolved product or contract decisions inside the handoff.

### 7. Make the expected return artifact explicit
The receiver should know whether they are expected to return:
- a task packet result
- a contract proposal
- an implementation handoff
- a completion note
- a blocker report
- a decision request

---

## Planning Handoff Template

# Planning Handoff

## 1. Handoff Metadata

- **Handoff title**:
- **Date**:
- **Handoff author**:
- **Source planning artifact(s)**:
- **Target owner**:
  - [ ] Frontend
  - [ ] Backend
  - [ ] Shared / Contract owner
  - [ ] QA
  - [ ] Reviewer
  - [ ] Release owner
  - [ ] Human product owner
  - [ ] Other
- **Handoff type**:
  - [ ] Slice dispatch
  - [ ] Task packet dispatch
  - [ ] Contract-first pre-dispatch
  - [ ] Decision escalation
  - [ ] Replanning handoff
- **Priority**:
  - [ ] P0
  - [ ] P1
  - [ ] P2
  - [ ] P3
- **Current status**:
  - [ ] Ready for execution
  - [ ] Ready pending contract clarification
  - [ ] Ready pending human decision
  - [ ] Partial dispatch only
  - [ ] Blocked

### Current handoff intent
Summarize in 2–5 lines:
- what is being handed off
- why this owner is the correct next owner
- what should happen immediately after handoff

---

## 2. What Is Being Handed Off

Describe the exact planning object being transferred.

Choose one or more:
- [ ] Product frame
- [ ] Capability area
- [ ] Vertical slice
- [ ] Task packet candidate
- [ ] Final task packet
- [ ] Contract-sensitive work item
- [ ] Open decision requiring resolution
- [ ] Execution-state update

### Description
- 
- 
- 

### Why this is the right granularity
- 
- 
- 

The receiver should understand whether they are receiving:
- a planning boundary
- an execution-ready task
- or a blocked item requiring clarification

---

## 3. Why This Work Should Happen Now

Explain the execution logic behind the handoff.

### Why now
- 
- 
- 

### What this unlocks next
- 
- 
- 

### Why this should not be deferred
- 
- 
- 

This section should make sequencing visible, not assumed.

---

## 4. Scope Summary

Preserve the implementation-relevant scope.

### In scope
- 
- 
- 

### Out of scope
- 
- 
- 

### Explicit non-goals
- 
- 
- 

### Current scope confidence
- [ ] High
- [ ] Medium
- [ ] Low

### Notes on scope confidence
- 
- 
- 

If scope is still provisional, say so explicitly.

---

## 5. Product Intent Summary

Give the receiver enough product meaning to act correctly.

### Problem being solved
- 
- 
- 

### Target user or consumer
- 
- 
- 

### Core value of this slice or task
- 
- 
- 

### Success criteria relevant to this receiver
- 
- 
- 

Do not overload this section with roadmap detail.
Keep it directly useful for execution.

---

## 6. Planning Inputs the Receiver Must Use

List the exact artifacts the receiver should treat as input.

### Required inputs
- 
- 
- 

Examples:
- product frame
- decomposition output
- task packet
- repo guidance
- contract notes
- execution-state snapshot
- prior handoff from another agent

### Relevant docs / links
- 
- 
- 

### Inputs that are informative but not authoritative
- 
- 
- 

The receiver should know what to trust and what not to over-interpret.

---

## 7. Contract Assumptions and Shared Constraints

This section is mandatory if downstream work touches shared behavior.

### Contract assumptions currently in force
- 
- 
- 

### Shared constraints currently in force
- 
- 
- 

Examples:
- request/response shape assumptions
- empty vs error semantics
- user-scoped permission assumptions
- shared type expectations
- repo boundary constraints
- additive-only contract change assumption

### Contract confidence
- [ ] Confirmed
- [ ] Partially confirmed
- [ ] Assumed
- [ ] Blocked by ambiguity

### What the receiver must not silently redefine
- 
- 
- 

If contract assumptions are weak, say so clearly.

---

## 8. Dependencies and Blockers

Make execution dependencies visible.

### Hard dependencies
- 
- 
- 

### Soft dependencies
- 
- 
- 

### Blockers already known
- 
- 
- 

### Waiting on human decision?
- [ ] No
- [ ] Yes

If yes:
- **Decision needed**:
- **Why it matters**:
- **Can the receiver proceed with an assumption?**
  - [ ] Yes
  - [ ] No

Do not hand off work as “ready” if a true blocker is hidden here.

---

## 9. Ownership Boundary for the Receiver

Tell the receiver what they own in this step.

### Receiver owns
- 
- 
- 

### Receiver may touch with care
- 
- 
- 

### Receiver must not change
- 
- 
- 

Examples:
- do not redefine contract semantics
- do not expand scope to adjacent features
- do not change another domain’s ownership area without justification
- do not silently convert a planning assumption into product truth

This section should preserve repo and domain boundaries.

---

## 10. Expected Receiver Action

Say exactly what the receiver should do next.

### Primary action
- [ ] Generate task packet
- [ ] Implement scoped task
- [ ] Propose contract
- [ ] Review scope / risk
- [ ] Validate / QA
- [ ] Resolve human product decision
- [ ] Replan based on blocker
- [ ] Other

### Detailed next step
- 
- 
- 

### What should happen immediately after
- 
- 
- 

### What should not happen yet
- 
- 
- 

This section should remove ambiguity about the next move.

---

## 11. Expected Output From the Receiver

Be explicit about what artifact must come back.

### Receiver should return
- [ ] Frontend task packet result
- [ ] Backend task packet result
- [ ] Shared contract proposal
- [ ] Implementation handoff
- [ ] Completion note
- [ ] Blocker report
- [ ] Decision request
- [ ] Verification result
- [ ] Other

### Output requirements
- 
- 
- 

### Minimum return format
- 
- 
- 

Examples:
- task classification
- files likely affected
- contract assumptions used
- risks
- verification performed
- handoff to next owner
- explicit blocker if execution cannot proceed

---

## 12. Success Criteria for This Handoff

Define what makes this handoff successful.

### This handoff is successful when
- 
- 
- 

Examples:
- backend returns an execution-ready contract proposal
- frontend starts only within agreed UI scope
- shared contract owner resolves response semantics
- human owner resolves the blocked product decision
- receiver returns a structured handoff rather than informal notes

---

## 13. Risks the Receiver Should Watch

List only real risks relevant to this step.

### Risks
For each risk include:
- **Risk**:
- **Why it matters now**:
- **Likely impact**:
- **Mitigation / fallback**:

Example:

- **Risk**: Frontend may assume missing metadata fields are always present.
  - **Why it matters now**: This slice depends on stable rendering semantics.
  - **Likely impact**: UI rework or broken empty/error behavior.
  - **Mitigation / fallback**: Keep requiredness explicit before implementation.

- **Risk**:
  - **Why it matters now**:
  - **Likely impact**:
  - **Mitigation / fallback**:

---

## 14. Open Questions Preserved in Handoff

List unresolved issues that the receiver must see.

### Open questions
- **Question**:
  - **Current assumption**:
  - **Who should resolve it**:
  - **Does it block current execution?**
    - [ ] Yes
    - [ ] No

- **Question**:
  - **Current assumption**:
  - **Who should resolve it**:
  - **Does it block current execution?**
    - [ ] Yes
    - [ ] No

If none:
> None.

Do not convert open questions into hidden implementation detail.

---

## 15. Recommended Next Handoff Path

State what should happen after the receiver finishes.

### Likely next owner after this receiver
- [ ] Frontend
- [ ] Backend
- [ ] Shared / Contract owner
- [ ] QA
- [ ] Reviewer
- [ ] Release owner
- [ ] Human product owner
- [ ] Other

### Likely next artifact
- 
- 
- 

### Why this is the likely next step
- 
- 
- 

This keeps the multi-agent chain visible and controlled.

---

## 16. Execution-State Update

Seed or update the execution state so nothing is lost.

### Planned
- 
- 
- 

### Active
- 
- 
- 

### Ready next
- 
- 
- 

### Blocked
- 
- 
- 

### Deferred
- 
- 
- 

### Changed assumptions, if any
- 
- 
- 

---

## 17. Planning Handoff Completion Statement

Use one of the following and keep only the applicable one.

### Option A — Ready for downstream execution
> This planning handoff is complete. The scoped work, assumptions, dependencies, and next action are explicit enough for the target owner to proceed.

### Option B — Partial dispatch only
> This planning handoff is partially complete. Some work is ready to proceed, while the remaining ambiguity, blockers, or decisions are explicitly documented above.

### Option C — Escalation required before execution
> This planning handoff is not execution-ready. A product, contract, or ownership decision must be resolved before downstream work should begin.

---

## 18. Planning Handoff Quality Checklist

Before sending this handoff, confirm:

- [ ] I stated exactly what is being handed off
- [ ] I preserved scope, non-goals, and sequencing logic
- [ ] I preserved contract assumptions and shared constraints
- [ ] I made dependencies and blockers explicit
- [ ] I told the receiver what they own and what they must not silently change
- [ ] I stated the exact next action
- [ ] I stated the exact expected output from the receiver
- [ ] I preserved open questions instead of hiding them
- [ ] I indicated what success looks like for this handoff
- [ ] The next owner can act without reconstructing intent from chat history