
## Purpose

Use this template when an incoming request is still ambiguous and not yet ready to become executable task packets.

This template helps the Product Orchestrator Agent:
- clarify the request without over-questioning
- build a working product frame
- identify the highest-leverage unknowns
- separate current scope from future ideas
- determine whether the request is ready for decomposition into slices and task packets

This is an intake template, not an implementation template.

A good intake should reduce ambiguity enough to support planning.
It should not attempt to fully specify implementation details prematurely.

---

## When to Use This Template

Use this template when the incoming request looks like one of the following:

- “Help me finish AI Drive”
- “Build the search experience”
- “Add AI to the drive”
- “Make the extension more useful”
- “We need a v1”
- “We should support file Q&A”
- “Users need better file organization”
- “We should integrate this into the extension”

Use this template before:
- generating frontend or backend task packets
- assigning work to specialist implementation agents
- treating a feature as execution-ready

---

## Intake Output Standard

A completed intake should produce:

1. A current understanding of the request
2. A small set of high-leverage clarification questions
3. A first-pass product frame
4. A scope-shaping summary
5. A recommendation for the next step:
   - clarify more
   - decompose into capabilities
   - define contract work first
   - generate task packets
   - escalate a product decision

If the request is still too ambiguous for execution planning, the output must say so explicitly.

---

## Intake Rules

### 1. Clarify only what materially affects execution
Do not ask for every possible detail.
Ask only what changes:
- scope
- sequencing
- ownership
- interaction model
- contract design
- permission model
- user-visible promise
- success criteria

### 2. Prefer the smallest useful clarification set
Default target:
- 5 to 8 high-leverage questions
- grouped by theme where possible
- no long uncontrolled questionnaire

### 3. Synthesize after each answer round
Do not keep asking without reducing ambiguity.
After receiving answers, produce a structured synthesis.

### 4. Separate knowns, assumptions, and unknowns
Always distinguish:
- confirmed facts
- working assumptions
- open questions
- blocked decisions

### 5. Do not silently turn product ambiguity into implementation detail
If something is still unresolved, label it explicitly.
Do not bury unresolved product decisions inside future task packets.

### 6. Preserve execution momentum
If some ambiguity can safely remain as a labeled assumption, do not block planning unnecessarily.

---

## Intake Template

# Product Intake

## 1. Request Summary

- **Incoming request**:
- **Requester / source**:
- **Date**:
- **Product area**:
- **Related docs / context**:
- **Related repo areas if known**:

Restate the request in one or two sentences without adding invented detail.

### Current understanding
Summarize:
- what the requester seems to want
- what type of outcome they appear to expect
- whether this looks like a product request, a feature request, a workflow request, or a delivery request

---

## 2. Request Classification

Mark the best current classification.

- [ ] New product area
- [ ] New feature
- [ ] Extension of existing feature
- [ ] Cross-surface integration
- [ ] Workflow / platform capability
- [ ] Quality / usability improvement
- [ ] Delivery planning request
- [ ] Unknown / mixed

### Notes
- 
- 
- 

---

## 3. Intake Readiness Assessment

Assess whether the request is ready for decomposition.

### Current readiness
- [ ] Not ready for decomposition
- [ ] Ready for first-pass product framing
- [ ] Ready for capability decomposition
- [ ] Ready for slice planning
- [ ] Ready for task packet generation

### Why
- 
- 
- 

### Main reasons not yet ready, if applicable
- 
- 
- 

---

## 4. What Is Already Known

List only information that is currently known or strongly grounded.

### Known facts
- 
- 
- 

### Existing constraints already visible
- 
- 
- 

### Existing related capabilities or surfaces
- 
- 
- 

### Existing repository areas likely involved
- 
- 
- 

Do not mix assumptions into this section.

---

## 5. Working Assumptions

List assumptions that are currently being used to keep planning moving.

### Working assumptions
- 
- 
- 

For each assumption, include when useful:
- why the assumption is currently acceptable
- what would change if it proves wrong

---

## 6. High-Leverage Unknowns

List only the unknowns that materially affect planning.

### Open unknowns
- 
- 
- 

Good examples:
- who the primary user is
- what the first usable surface should be
- whether this is extension-first or API-first
- what the v1 promise is
- whether permissions are user-scoped or shared
- whether search, upload, browse, and AI actions are all in scope

Poor examples:
- low-value implementation preferences
- cosmetic questions that do not affect near-term planning

---

## 7. Clarification Questions

Ask only the smallest useful set of questions.

### Question set
For each question, include:
- **Question**:
- **Why it matters**:
- **What planning decision it unlocks**:

Example format:

- **Question**: Who is the primary user for v1?
  - **Why it matters**: This determines whether the product is optimized for personal file retrieval, collaborative knowledge work, or admin workflows.
  - **What planning decision it unlocks**: It changes the first slice, permission model assumptions, and success criteria.

- **Question**:
  - **Why it matters**:
  - **What planning decision it unlocks**:

- **Question**:
  - **Why it matters**:
  - **What planning decision it unlocks**:

Keep the list intentionally small.

---

## 8. First-Pass Product Frame

Use this section to synthesize the current best understanding, even if incomplete.

### Problem statement
What problem does this request appear to solve?

- 
- 
- 

### Target users
Who appears to be the primary user or users?

- 
- 
- 

### Core jobs to be done
What does the user likely need to accomplish?

- 
- 
- 

### Likely v1 value
What seems to be the smallest useful version of the product or feature?

- 
- 
- 

### Likely non-goals
What likely should not be included in v1?

- 
- 
- 

### Success criteria (early draft)
How would we know this is useful or successful?

- 
- 
- 

This section may remain provisional.
If so, mark it clearly in the notes.

---

## 9. Scope-Shaping Summary

This section translates the intake into planning shape.

### Likely scope size
- [ ] Very small
- [ ] Small
- [ ] Medium
- [ ] Large
- [ ] Very large / multi-phase

### Likely domain involvement
- [ ] Frontend only
- [ ] Backend only
- [ ] Frontend + Backend
- [ ] Shared contract work required
- [ ] Product / design decision required first
- [ ] Unknown

### Likely risk areas
- [ ] Scope ambiguity
- [ ] Contract ambiguity
- [ ] Permission / auth ambiguity
- [ ] Interaction ambiguity
- [ ] Data-source ambiguity
- [ ] Sequencing ambiguity
- [ ] Cross-boundary ownership ambiguity
- [ ] Unknown

### Notes
- 
- 
- 

---

## 10. Candidate Capability Areas

List only first-pass capability areas, not final decomposition.

Examples:
- identity and access
- file ingestion
- file browse / list
- file search
- file detail
- AI actions on files
- extension entry points
- API contract layer
- telemetry / observability

### Candidate capabilities
- 
- 
- 

Do not over-decompose at intake stage.

---

## 11. Candidate First Slice

Recommend a likely first vertical slice if enough information exists.

A good first slice should be:
- narrow
- meaningful
- contract-aware
- executable by downstream agents
- easy to verify

### Recommended first slice
- 
- 
- 

### Why this slice first
- 
- 
- 

### What it would likely include
- 
- 
- 

### What it would likely exclude
- 
- 
- 

If a first slice cannot yet be recommended, explain why.

---

## 12. Recommended Next Step

Choose one:

- [ ] Ask clarification questions and wait for answers
- [ ] Produce a product frame from current information
- [ ] Decompose into capability map
- [ ] Produce a slice plan
- [ ] Generate task packets
- [ ] Escalate a product decision to human owner
- [ ] Stop because the request is too ambiguous

### Why this is the right next step
- 
- 
- 

### What should happen immediately after
- 
- 
- 

---

## 13. Intake Handoff Notes

If another planning step or owner is next, leave a structured handoff.

### Next owner
- [ ] Product Orchestrator Agent
- [ ] Frontend Agent
- [ ] Backend Agent
- [ ] Shared / Contract owner
- [ ] Human product owner
- [ ] Reviewer
- [ ] Other

### What the next owner should use as input
- 
- 
- 

### What the next owner should not assume
- 
- 
- 

### What would make the next step successful
- 
- 
- 

---

## 14. Intake Quality Checklist

Before considering intake complete, confirm:

- [ ] I restated the request without inventing hidden details
- [ ] I separated knowns, assumptions, and unknowns
- [ ] I asked only high-leverage clarification questions
- [ ] I explained why each question matters
- [ ] I produced a first-pass product frame
- [ ] I did not over-decompose too early
- [ ] I recommended a concrete next step
- [ ] A downstream planner or owner could continue from this intake without reconstructing context

---

## 15. Example Intake Trigger

### Example incoming request
> Help me finish AI Drive.

### Example of good first response shape
- Current understanding
- 5–8 high-leverage questions
- A first-pass hypothesis of what AI Drive might include
- A recommendation on whether to move next into product framing or capability decomposition

### Example of bad first response shape
- A giant backlog with no clarified scope
- Immediate frontend/backend implementation tasks
- Endless open-ended questions with no synthesis
- False certainty about user flows, permissions, or v1 promise