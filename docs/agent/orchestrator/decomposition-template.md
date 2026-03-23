
## Purpose

Use this template after intake has produced enough clarity to move from product framing into execution planning.

This template helps the Product Orchestrator Agent:
- decompose a product or feature into capability areas
- group capabilities into executable vertical slices
- identify dependencies, decisions, and risks
- map work to frontend, backend, and shared contract surfaces
- produce task packet candidates that downstream agents can execute

This is a decomposition template, not a coding template.

A good decomposition should produce work that is:
- meaningful
- scoped
- sequenced
- ownership-aware
- contract-aware
- ready to become executable task packets

---

## When to Use This Template

Use this template when:
- intake has produced a workable product frame
- the request is clear enough to identify capabilities
- the next question is “how should we split and sequence the work?”
- frontend and backend should not yet be asked to code directly from raw product intent
- the system needs a slice plan before dispatching implementation work

Use this template before:
- generating final frontend/backend task packets
- assigning execution to specialist agents
- declaring a feature or product area implementation-ready

---

## Decomposition Output Standard

A completed decomposition should produce:

1. A decomposition summary
2. A capability map
3. A prioritized slice plan
4. Dependency and decision visibility
5. Ownership mapping across frontend/backend/shared surfaces
6. Task packet candidates
7. A recommendation for what should be dispatched next

If the feature is still too ambiguous for slice planning, the output must say so explicitly.

---

## Decomposition Rules

### 1. Decompose around user value and execution reality
Capabilities and slices should reflect real user flows or system value, not arbitrary architecture buckets.

### 2. Prefer vertical slices over horizontal phase buckets
Do not decompose only into generic layers like:
- backend first
- frontend later
- testing later

Prefer slices that can actually move the product forward and be verified.

### 3. Keep capability map broader than slice plan
Capabilities are the structural map.
Slices are the execution plan.

Do not confuse a domain inventory with a delivery sequence.

### 4. Make dependencies explicit
If a slice depends on:
- a contract decision
- auth behavior
- data source readiness
- a shared package update
- a human product decision

document that dependency instead of hiding it.

### 5. Keep ownership visible
Every slice should make it clear whether it primarily involves:
- frontend
- backend
- shared contract work
- cross-domain coordination
- human product/design decision

### 6. Avoid false completeness
A decomposition is not “good” because it looks comprehensive.
It is good only if downstream agents can act on it without inventing missing product meaning.

### 7. Identify what should happen now vs later
Separate:
- now
- next
- later
- explicitly deferred

### 8. Prefer the smallest meaningful first slice
The first slice should:
- deliver visible product progress
- be narrow enough to finish
- expose important contract risks early
- create leverage for later slices

---

## Decomposition Template

# Product Decomposition

## 1. Decomposition Metadata

- **Feature / product area**:
- **Source intake / product frame**:
- **Date**:
- **Primary orchestrator owner**:
- **Related docs / links**:
- **Current planning stage**:
  - [ ] Early decomposition
  - [ ] Slice planning
  - [ ] Pre-dispatch
  - [ ] Replanning after execution feedback

### Current planning context
Summarize:
- what is being decomposed
- why decomposition is happening now
- what downstream execution this decomposition is intended to unlock

---

## 2. Product Frame Summary

Copy or summarize the current working product frame.

### Problem statement
- 
- 
- 

### Target users
- 
- 
- 

### Core jobs to be done
- 
- 
- 

### v1 scope
- 
- 
- 

### Non-goals
- 
- 
- 

### Success criteria
- 
- 
- 

### Planning notes
- 
- 
- 

This section should anchor the rest of the decomposition.
Do not proceed from a vague or unstable frame without labeling that instability.

---

## 3. Decomposition Readiness Check

Assess whether the scope is ready to be split into capabilities and slices.

### Current readiness
- [ ] Ready for capability mapping
- [ ] Ready for slice planning
- [ ] Ready for task packet generation
- [ ] Not ready yet

### Why
- 
- 
- 

### If not ready, what is missing?
- 
- 
- 

---

## 4. Capability Map

List the major capability areas required to deliver the product or feature.

A capability should represent a meaningful area of user or system value, not just an implementation layer.

### Candidate capabilities
For each capability include:
- **Capability name**:
- **What it enables**:
- **Why it exists**:
- **Primary domains involved**:
  - [ ] Frontend
  - [ ] Backend
  - [ ] Shared contract
  - [ ] Human decision required
- **Current maturity**:
  - [ ] Not started
  - [ ] Partially defined
  - [ ] Execution-ready
  - [ ] Blocked
- **Notes**:

Example format:

- **Capability name**: File Search
  - **What it enables**: Users can find relevant files by query.
  - **Why it exists**: Search is the fastest route to drive usefulness in v1.
  - **Primary domains involved**:
    - [x] Frontend
    - [x] Backend
    - [x] Shared contract
    - [ ] Human decision required
  - **Current maturity**:
    - [ ] Not started
    - [x] Partially defined
    - [ ] Execution-ready
    - [ ] Blocked
  - **Notes**: Contract semantics for empty vs failure must be explicit.

- **Capability name**:
  - **What it enables**:
  - **Why it exists**:
  - **Primary domains involved**:
    - [ ]
    - [ ]
    - [ ]
    - [ ]
  - **Current maturity**:
    - [ ]
    - [ ]
    - [ ]
    - [ ]
  - **Notes**:

Keep this list broad enough to reflect the product, but not so broad that it becomes a generic wishlist.

---

## 5. Capability Boundaries and Relationships

Describe how the capabilities relate to one another.

### Upstream / downstream relationships
- 
- 
- 

### Capabilities that can proceed independently
- 
- 
- 

### Capabilities that are blocked by shared decisions
- 
- 
- 

### Capabilities that should not be parallelized yet
- 
- 
- 

This section should make sequencing logic visible.

---

## 6. Candidate Vertical Slices

Turn the capability map into executable slices.

Each slice should represent a deliverable increment that creates:
- user value
- integration value
- risk reduction
- or planning leverage

### Slice list
For each slice include:
- **Slice name**:
- **Goal**:
- **User or system value**:
- **Capabilities included**:
- **What it intentionally excludes**:
- **Why this slice exists now**:
- **Primary owners involved**:
  - [ ] Frontend
  - [ ] Backend
  - [ ] Shared contract
  - [ ] Human decision required
- **Readiness**:
  - [ ] Draft
  - [ ] Candidate
  - [ ] Execution-ready
  - [ ] Blocked

Example format:

- **Slice name**: Drive Search v1
  - **Goal**: Let users search drive files from the extension and see basic results.
  - **User or system value**: Delivers the fastest useful retrieval experience for early AI Drive usage.
  - **Capabilities included**:
    - File Search
    - Extension Search Entry
    - Search Result Rendering
    - Search Contract Surface
  - **What it intentionally excludes**:
    - File preview
    - Saved searches
    - Advanced filters
    - Search ranking optimization
  - **Why this slice exists now**: It is narrow, testable, and reveals contract and metadata risks early.
  - **Primary owners involved**:
    - [x] Frontend
    - [x] Backend
    - [x] Shared contract
    - [ ] Human decision required
  - **Readiness**:
    - [ ] Draft
    - [x] Candidate
    - [ ] Execution-ready
    - [ ] Blocked

- **Slice name**:
  - **Goal**:
  - **User or system value**:
  - **Capabilities included**:
  - **What it intentionally excludes**:
  - **Why this slice exists now**:
  - **Primary owners involved**:
    - [ ]
    - [ ]
    - [ ]
    - [ ]
  - **Readiness**:
    - [ ]
    - [ ]
    - [ ]
    - [ ]

---

## 7. Slice Prioritization

Prioritize the candidate slices.

### Priority order
For each slice include:
- **Priority**:
- **Slice name**:
- **Why now**:
- **What it unlocks next**:
- **Why not later**:
- **Main risk**:

Example format:

- **Priority**: 1
  - **Slice name**: Drive Search v1
  - **Why now**: It delivers immediate utility and forces early contract clarity.
  - **What it unlocks next**: File detail, AI actions on top of results, telemetry baselines.
  - **Why not later**: Many later experiences depend on a first retrieval path.
  - **Main risk**: Search contract ambiguity.

- **Priority**:
  - **Slice name**:
  - **Why now**:
  - **What it unlocks next**:
  - **Why not later**:
  - **Main risk**:

### Explicitly deferred slices
- 
- 
- 

Explain why they are deferred.

---

## 8. Slice Dependency Map

Make slice dependencies explicit.

### Hard dependencies
- 
- 
- 

### Soft dependencies
- 
- 
- 

### Shared contract dependencies
- 
- 
- 

### Human decision dependencies
- 
- 
- 

### Notes on sequencing
- 
- 
- 

This section should make it obvious which slice can be dispatched now and which cannot.

---

## 9. Ownership and Routing Map

Map slices to likely execution owners.

### Routing table

| Slice | Frontend | Backend | Shared contract | Human decision | Notes |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

### Routing notes
- 
- 
- 

The goal here is not to assign individuals.
It is to make domain responsibility explicit before task packets are generated.

---

## 10. Contract-Sensitive Areas

Identify the parts of the decomposition that need contract-first treatment before implementation.

### Contract-sensitive areas
For each area include:
- **Area**:
- **Why contract-first matters**:
- **Likely producer**:
- **Likely consumer**:
- **Main open question**:
- **Needs dedicated contract task first?**
  - [ ] Yes
  - [ ] No
  - [ ] Maybe

Example:

- **Area**: Search API response semantics
  - **Why contract-first matters**: Frontend behavior depends on the distinction between empty results and backend failure.
  - **Likely producer**: Backend
  - **Likely consumer**: Frontend
  - **Main open question**: Whether retryable and terminal errors are structurally distinct in v1.
  - **Needs dedicated contract task first?**
    - [x] Yes
    - [ ] No
    - [ ] Maybe

- **Area**:
  - **Why contract-first matters**:
  - **Likely producer**:
  - **Likely consumer**:
  - **Main open question**:
  - **Needs dedicated contract task first?**
    - [ ]
    - [ ]
    - [ ]

---

## 11. Decision Log

List only decisions that materially affect decomposition or sequencing.

### Confirmed decisions
- 
- 
- 

### Open decisions
For each decision include:
- **Decision**:
- **Why it matters**:
- **Who should decide**:
- **Blocks which slice(s)**:
- **Can planning continue with an assumption?**
  - [ ] Yes
  - [ ] No

Example:

- **Decision**: Is AI Drive v1 extension-first?
  - **Why it matters**: It changes which slice should be prioritized first.
  - **Who should decide**: Human product owner
  - **Blocks which slice(s)**: Entry-point and interaction slices
  - **Can planning continue with an assumption?**
    - [x] Yes
    - [ ] No

- **Decision**:
  - **Why it matters**:
  - **Who should decide**:
  - **Blocks which slice(s)**:
  - **Can planning continue with an assumption?**
    - [ ]
    - [ ]

---

## 12. Risk Summary

List only real planning or execution risks surfaced by the decomposition.

### Risks
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
- **Why it matters**:
- **Affected slices**:
- **Mitigation / fallback**:
- **Owner**:

Example:

- **Risk**: Search metadata completeness may be inconsistent across sources
  - **Category**:
    - [ ] Scope
    - [x] Contract
    - [ ] Auth / permission
    - [ ] Interaction
    - [x] Data source
    - [ ] Sequencing
    - [ ] Ownership
    - [ ] Operational
  - **Why it matters**: Frontend rendering and task scope depend on required field guarantees.
  - **Affected slices**: Drive Search v1
  - **Mitigation / fallback**: Tighten required fields or design fallback rendering early.
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
  - **Why it matters**:
  - **Affected slices**:
  - **Mitigation / fallback**:
  - **Owner**:

---

## 13. Task Packet Candidates

Convert the prioritized slice plan into concrete task packet candidates.

### Candidate task packets
For each candidate include:
- **Task packet title**:
- **Domain**:
  - [ ] Frontend
  - [ ] Backend
  - [ ] Shared contract
  - [ ] Review / QA
- **Parent slice**:
- **Goal**:
- **Why this task exists**:
- **Primary repo areas likely involved**:
- **Depends on**:
- **Should be generated now?**
  - [ ] Yes
  - [ ] No
- **Notes**:

Example:

- **Task packet title**: Drive Search API v1
  - **Domain**:
    - [ ] Frontend
    - [x] Backend
    - [ ] Shared contract
    - [ ] Review / QA
  - **Parent slice**: Drive Search v1
  - **Goal**: Provide a backend endpoint and stable response semantics for drive search.
  - **Why this task exists**: Frontend cannot implement user-facing search safely without backend semantics.
  - **Primary repo areas likely involved**:
    - `apps/api-server/**`
    - `packages/api-contract/**`
  - **Depends on**:
    - Search response contract clarification
  - **Should be generated now?**
    - [x] Yes
    - [ ] No
  - **Notes**: Keep endpoint read-only and side-effect free.

- **Task packet title**:
  - **Domain**:
    - [ ]
    - [ ]
    - [ ]
    - [ ]
  - **Parent slice**:
  - **Goal**:
  - **Why this task exists**:
  - **Primary repo areas likely involved**:
  - **Depends on**:
  - **Should be generated now?**
    - [ ]
    - [ ]
  - **Notes**:

This section is where planning begins to become dispatchable.

---

## 14. Recommended Dispatch Plan

Recommend what should be generated and routed next.

### Dispatch now
- 
- 
- 

### Do not dispatch yet
- 
- 
- 

### Why
- 
- 
- 

### Recommended order
1.
2.
3.

### Expected outputs from downstream agents
- 
- 
- 

Example:
- backend should return contract proposal + implementation handoff
- frontend should return UI-ready handoff after backend semantics stabilize
- shared contract owner should return executable contract artifacts if needed

---

## 15. Execution-State Seed

Create the initial state view that later planning updates can extend.

### Planned
- 
- 
- 

### Ready to dispatch
- 
- 
- 

### Blocked
- 
- 
- 

### Waiting for human decision
- 
- 
- 

### Deferred
- 
- 
- 

This section should make the next planning checkpoint obvious.

---

## 16. Decomposition Completion Statement

Use one of the following and keep only the applicable one.

### Option A — Ready for task packet generation
> The product scope has been decomposed enough to generate executable task packets for the slices listed above.

### Option B — Ready for partial dispatch
> Some slices are ready to become executable task packets, while others remain blocked or intentionally deferred as documented above.

### Option C — Not ready for execution planning
> The current product frame is not yet stable enough for reliable slice planning or task packet generation. The missing decisions and next clarification steps are explicitly documented above.

---

## 17. Decomposition Quality Checklist

Before considering this decomposition complete, confirm:

- [ ] I decomposed around user or system value, not just architecture layers
- [ ] I separated capabilities from slices
- [ ] I made sequencing and dependencies visible
- [ ] I made ownership and routing visible
- [ ] I surfaced contract-sensitive areas explicitly
- [ ] I produced task packet candidates, not just a backlog
- [ ] I identified what can be dispatched now vs later
- [ ] I documented risks and open decisions
- [ ] A downstream agent could act on this plan without inventing missing product meaning