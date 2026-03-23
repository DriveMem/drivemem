
## Purpose

Use this template to define backend work before implementation starts.

A backend task packet should make the work:
- explicit
- scoped
- contract-aware
- reviewable
- verifiable
- safe for downstream consumers

A good task packet should let a backend agent begin work without inventing hidden semantics.

---

## Task Metadata

- **Task title**:
- **Task / ticket ID**:
- **Owner / requester**:
- **Primary backend owner**:
- **Related agents / teams**:
- **Priority**:
  - [ ] P0
  - [ ] P1
  - [ ] P2
  - [ ] P3
- **Status**:
  - [ ] Draft
  - [ ] Ready for implementation
  - [ ] Blocked
  - [ ] In progress
  - [ ] Ready for review
  - [ ] Done
- **Target milestone / release**:
- **Related docs / links**:

---

## 1. Problem Statement

Describe the problem this task is solving.

Include:
- what is broken, missing, or changing
- why backend work is needed
- who is affected
- why this work matters now

Keep this section concrete and implementation-relevant.

---

## 2. Goal

Describe the intended backend outcome.

This should answer:
- what capability should exist after this task
- what backend behavior should change
- what downstream consumer should now be able to rely on

---

## 3. Scope

### In scope
List the backend work that must be completed in this task.

- 
- 
- 

### Out of scope
List what this task must not silently include.

- 
- 
- 

### Non-goals
List changes that may sound related but are not part of this task.

- 
- 
- 

---

## 4. Current State

Describe the current backend behavior relevant to this task.

Include as applicable:
- existing endpoints / handlers / jobs
- current schema or persistence shape
- current auth / permission behavior
- existing contract behavior
- known limitations
- existing workarounds or technical debt relevant to the task

---

## 5. Desired End State

Describe the expected backend behavior after this task is complete.

Include as applicable:
- endpoint / handler / job behavior
- response semantics
- validation behavior
- state transitions
- persistence changes
- operational behavior
- expected downstream consumer experience

Be explicit about behavior, not just code changes.

---

## 6. Consumer Impact

Identify who consumes the backend behavior.

### Known consumers
- [ ] Frontend
- [ ] Another backend service
- [ ] Internal tool / automation
- [ ] Analytics / telemetry pipeline
- [ ] Batch job / queue worker
- [ ] Admin workflow
- [ ] External / partner integration
- [ ] Other:

### Consumer notes
- 
- 
- 

### Consumer risk if semantics are wrong
- 
- 
- 

---

## 7. Contract Impact

Classify the contract effect of this task.

### Contract classification
- [ ] No shared contract impact
- [ ] Uses existing contract as-is
- [ ] Clarifies existing contract
- [ ] Additive contract change
- [ ] Modifying contract change
- [ ] Breaking contract change
- [ ] New contract

### Contract source of truth
- schema / interface / doc:
- version / reference:
- owner / steward:

### Contract details
Document the relevant contract semantics:

#### Request shape
- 
- 
- 

#### Response shape
- 
- 
- 

#### Required / optional / nullable fields
- 
- 
- 

#### Status / state semantics
- 
- 
- 

#### Error semantics
- 
- 
- 

#### Retry / idempotency expectations
- 
- 
- 

#### Ordering / filtering / pagination semantics if applicable
- 
- 
- 

### Open contract questions
- 
- 
- 

If any contract-impacting detail is unknown, do not leave it implicit.

---

## 8. Data / Persistence Impact

Indicate whether this task changes stored data behavior.

### Data impact classification
- [ ] No data impact
- [ ] Read-path only
- [ ] Write-path behavior change
- [ ] Schema change
- [ ] Migration required
- [ ] Backfill required
- [ ] Data interpretation change
- [ ] Index / performance-sensitive persistence change

### Details
- affected tables / collections / entities:
- migration needed:
- backward compatibility expectations:
- rollback or forward-fix strategy:
- impact on existing records:
- concurrency / stale-write concerns:

### Open data questions
- 
- 
- 

---

## 9. Auth / Permission / Safety Impact

Mark all that apply.

- [ ] No auth / safety impact
- [ ] Authentication behavior affected
- [ ] Authorization behavior affected
- [ ] Entitlement / billing gating affected
- [ ] Destructive action involved
- [ ] Admin-only behavior involved
- [ ] Privacy-sensitive data involved
- [ ] Export / delete / mutation flow involved
- [ ] Security-sensitive payload involved

### Details
- current behavior:
- intended behavior:
- failure mode if implemented incorrectly:
- reviewer / approver needed:

If this section is relevant, be explicit. Do not assume safe defaults without stating them.

---

## 10. Operational / Reliability Considerations

List runtime concerns relevant to this task.

Mark all that apply:
- [ ] No special runtime risk
- [ ] Dependency failure risk
- [ ] Timeout / retry risk
- [ ] Duplicate request risk
- [ ] Eventual consistency
- [ ] Queue / async processing
- [ ] Partial failure handling
- [ ] Rate limiting / throttling
- [ ] Performance-sensitive path
- [ ] High-cardinality logging or telemetry concern
- [ ] Observability requirement
- [ ] Rollout sequencing concern

### Details
- 
- 
- 

### Fallback / degradation expectations
- 
- 
- 

---

## 11. Repository Scope

List the expected repository areas involved.

### Expected owned paths
- ``
- ``
- ``

### Expected shared paths
- ``
- ``
- ``

### Cross-boundary edits expected?
- [ ] No
- [ ] Yes, minimal and justified
- [ ] Unknown yet

If yes, explain:
- why a local-only change is insufficient
- what foreign-owned files may need touching
- what review is expected

---

## 12. Acceptance Criteria

List concrete acceptance criteria.

Each item should be testable.

- [ ]
- [ ]
- [ ]
- [ ]

Good acceptance criteria describe observable behavior, not vague intent.

Examples:
- [ ] Endpoint returns `processing`, `ready`, and `failed` states with documented semantics
- [ ] Invalid input returns structured validation error
- [ ] Duplicate submission does not create duplicate records
- [ ] Existing consumers continue to work without modification

---

## 13. Non-Functional Requirements

Include only what matters for this task.

- performance expectations:
- latency expectations:
- throughput expectations:
- security requirements:
- observability requirements:
- audit / compliance requirements:
- backward compatibility requirements:
- rollout / feature flag requirements:

If none, write:
> None.

---

## 14. Dependencies

List dependencies that affect execution.

### Upstream dependencies
- 
- 
- 

### Downstream dependencies
- 
- 
- 

### External dependencies
- 
- 
- 

### Blocking decisions
- 
- 
- 

---

## 15. Implementation Notes

Use this section for constraints or guidance that matter to the backend agent.

Examples:
- preserve existing response field names
- extend instead of replacing current contract
- do not change auth behavior outside this endpoint
- prefer additive migration strategy
- keep compatibility with current queue payload format

### Notes
- 
- 
- 

---

## 16. Verification Plan

Define how this task will be verified before work starts.

### Required verification
- [ ] Unit tests
- [ ] Integration tests
- [ ] Contract tests
- [ ] Migration tests
- [ ] Manual endpoint validation
- [ ] Error-path validation
- [ ] Auth / permission validation
- [ ] Retry / idempotency validation
- [ ] Logging / metrics / trace inspection
- [ ] Staging / preview verification
- [ ] End-to-end verification with consumer
- [ ] Other:

### Required scenarios
- happy path:
- invalid input:
- unauthorized / forbidden:
- dependency failure:
- duplicate request / retry:
- empty / missing data:
- partial failure if applicable:
- migration / old-data compatibility if applicable:

### Verification evidence expected
- 
- 
- 

A task should not be marked ready unless the verification bar is visible here.

---

## 17. Handoff Expectations

If this task is not fully self-contained, specify what handoff will be needed.

### Expected next owner
- [ ] Frontend
- [ ] Backend
- [ ] QA
- [ ] Reviewer
- [ ] Release owner
- [ ] Data / analytics owner
- [ ] Security / privacy reviewer
- [ ] Other:

### Handoff must include
- [ ] files changed
- [ ] contract semantics
- [ ] migration notes
- [ ] risks
- [ ] verification performed
- [ ] verification not performed
- [ ] exact next step for receiver

### Expected handoff trigger
- 
- 
- 

---

## 18. Risks

List real risks only.

For each risk include:
- **Risk**:
- **Impact area**:
- **Likelihood**:
- **Mitigation / fallback**:
- **Owner**:

Examples:
- contract ambiguity
- migration safety
- stale consumer assumptions
- auth regression
- duplicate side effects on retry
- insufficient observability on failure path
- rollout mismatch between producer and consumer

---

## 19. Open Questions

List only unresolved questions.

- **Question**:
  - why it matters:
  - current assumption:
  - owner to resolve:

- **Question**:
  - why it matters:
  - current assumption:
  - owner to resolve:

If none:
> None.

---

## 20. Definition of Done for This Task

This task is done when all of the following are true:

- [ ] Scoped backend implementation is complete
- [ ] Acceptance criteria are met
- [ ] Contract expectations are implemented or explicitly updated
- [ ] Data / migration impact is handled safely
- [ ] Auth / safety impact is verified if applicable
- [ ] Verification has been completed to the required level
- [ ] Risks and open questions are documented
- [ ] Required handoff or completion note is prepared
- [ ] No hidden blocker remains

Add any task-specific done conditions below:
- 
- 
- 

---

## 21. Packet Quality Checklist

Before marking this packet as ready for implementation, confirm:

- [ ] The problem and goal are clear
- [ ] Scope and non-goals are explicit
- [ ] Consumer impact is identified
- [ ] Contract impact is classified
- [ ] Data / migration impact is classified
- [ ] Auth / safety impact is explicit
- [ ] Acceptance criteria are testable
- [ ] Verification plan is defined
- [ ] Risks and open questions are visible
- [ ] The backend agent can start without inventing hidden semantics
---

## 22. Relationship to Other Docs

This template defines the task intake structure for backend work.

Related documents:
- `docs/agent/backend/backend-agent.md` defines backend agent execution rules
- `docs/agent/backend/handoff-template.md` defines downstream transfer structure
- `docs/agent/backend/definition-of-done.md` defines completion quality bar
- `docs/agent/shared/operating-model.md` defines collaboration flow and handoff model
- `docs/agent/shared/contract-first-policy.md` defines contract lifecycle rules
- `docs/agent/shared/repo-boundaries.md` defines ownership and cross-boundary edit rules
