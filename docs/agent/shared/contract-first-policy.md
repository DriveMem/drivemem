
## 1. Purpose

This document defines the contract-first policy for cross-boundary work in this repository.

The goal is to ensure that frontend and backend collaboration is:
- explicit
- reviewable
- backward-aware
- easy to validate
- resistant to silent semantic drift

A contract-first workflow means agents align on the interface before implementing coupled behavior.

This policy applies whenever work crosses ownership boundaries or changes a shared integration surface.

---

## 2. What “Contract” Means

A contract is any machine- or human-consumable interface that one domain depends on from another domain.

Contracts include, but are not limited to:
- API request/response schemas
- shared types used across domain boundaries
- event / telemetry schemas
- RPC or tool/function input-output schemas
- persisted payload formats consumed by another domain
- configuration structures with cross-domain consumers
- error codes / error response shapes
- pagination, filtering, sorting, and field semantics
- compatibility guarantees relied upon by another domain

A contract is not just field shape.
A contract also includes behavior and meaning.

For example, a contract includes:
- whether a field is required, optional, or nullable
- what an enum value means
- whether an empty list means “no results” or “not authorized”
- whether an omitted field means “unknown”, “unset”, or “use default”
- whether retries are safe
- what errors are possible and when

---

## 3. Core Policy

### 3.1 Contract before coupled implementation
If two domains must integrate, they should align on the contract before implementing tightly coupled behavior.

### 3.2 No silent contract decisions
If a contract-impacting detail is unclear, the agent must not silently guess and continue.

The ambiguity must be explicitly marked as one of:
- proposed
- assumed
- blocked
- out of scope
- needs decision

### 3.3 No silent semantic changes
A change that preserves syntax but changes meaning is still a contract change.

Examples:
- changing the meaning of `status="ready"`
- returning `null` where the previous meaning was “field omitted”
- reusing an enum for a new case without documenting it
- changing sort order or default filtering semantics
- changing when a response is considered success vs failure

### 3.4 Consumers matter as much as producers
A contract is not “owned” only by the producing side.
The producer defines it, but the consumer experience determines whether the contract is usable, stable, and safe to change.

### 3.5 Additive first, breaking last
When possible, prefer additive contract evolution over breaking replacement.

### 3.6 Written contract beats implicit memory
If a behavior matters for integration, it should appear in a documented contract surface, task packet, or handoff.
It should not live only in a person’s memory or in “what the code seems to imply.”

---

## 4. When This Policy Is Required

This policy is mandatory for:

- frontend ↔ backend integration work
- shared schema or shared type changes
- telemetry/event schema changes
- tool/function schema changes used by agents or automation
- changes to public or semi-public interfaces between modules
- changes to compatibility expectations
- any change where one domain can break another without touching its code

This policy is optional but recommended for local changes that may later become shared.

---

## 5. Contract Source of Truth

Every active contract should have a source of truth.

Acceptable sources of truth include:
- schema files
- typed interface definitions
- versioned API docs
- shared contract definitions in repository
- a task packet section explicitly defining the contract for a one-off task
- a contract decision record linked from the task

The source of truth must be:
- versioned
- reviewable
- close enough to implementation to stay maintained
- discoverable by both producer and consumer

If multiple sources disagree, the task is not ready for implementation until the conflict is resolved.

---

## 6. Contract Minimum Requirements

A contract is not considered implementation-ready unless the following are clear.

### 6.1 Shape
- request fields
- response fields
- nesting structure
- types
- enum sets
- list behavior

### 6.2 Semantics
- meaning of each field
- required vs optional vs nullable
- default values
- interpretation of omitted fields
- business meaning of statuses and flags

### 6.3 Behavior
- success conditions
- failure conditions
- retry expectations
- ordering guarantees if any
- pagination / cursor semantics if any
- idempotency expectations if any

### 6.4 State handling
- loading-relevant expectations if applicable
- empty-state meaning
- partial-data behavior
- stale / pending / processing states if applicable

### 6.5 Compatibility
- whether the change is additive, modifying, or breaking
- expected affected consumers
- migration or deprecation expectations
- rollout constraints if any

### 6.6 Verification
- how the contract will be validated
- what tests or examples prove compliance
- what edge cases must be checked

If these are not sufficiently defined, the contract should be considered draft, not final.

---

## 7. Contract Change Types

Every contract update must be classified before implementation.

### 7.1 New contract
A new integration surface is introduced.

### 7.2 Clarification
The intended behavior already existed, but the contract documentation was incomplete or ambiguous.
Clarifications must not be used to hide breaking semantic changes.

### 7.3 Additive change
A backward-compatible extension is added.

Examples:
- adding a new optional field
- adding a new endpoint that does not affect existing consumers
- adding a new enum value only if existing consumers are documented as tolerant to unknown values

### 7.4 Modifying change
Behavior or structure changes in a way that may affect consumers, but not always fatally.

Examples:
- changing default sort behavior
- changing field nullability
- changing validation rules
- changing error categorization

### 7.5 Breaking change
A consumer that was correct before may fail or behave incorrectly after the change unless updated.

Examples:
- removing or renaming fields
- changing field type
- changing requiredness
- removing enum values
- changing response shape
- changing semantics relied upon by consumers

### 7.6 Deprecation
A contract remains supported temporarily but is marked for replacement or removal.
Deprecation must include:
- what is deprecated
- replacement path
- expected removal timing or condition
- known impacted consumers

---

## 8. Contract Decision Workflow

### 8.1 Propose
Before implementation, the proposing agent should define:
- the problem to solve
- the proposed contract or change
- why existing contract is insufficient
- change classification
- known consumers
- risks
- open questions

### 8.2 Review
Relevant owners review:
- correctness
- usability for consumers
- compatibility impact
- edge cases
- risk of ambiguity
- observability and verification plan

### 8.3 Decide
The contract decision should be marked explicitly as:
- approved
- approved with constraints
- needs revision
- blocked

### 8.4 Implement
Implementation should follow the approved contract, not invent adjacent semantics during coding.

### 8.5 Verify
Producer and consumer behavior should be validated against the agreed contract.

### 8.6 Record
The final implemented contract and any deviations from proposal should be documented in:
- schema / contract source of truth
- task packet
- handoff or completion note
- migration notes if applicable

---

## 9. Rules for Proposing Contracts

A good contract proposal should optimize for:
- clarity
- minimality
- stability
- ease of consumer adoption
- easy verification

Preferred proposal style:
- define the exact interface
- define the meaning of each field
- define success and failure behavior
- define compatibility expectations
- include at least one concrete example
- include edge cases when relevant

Avoid proposal styles that are:
- purely conversational
- reliant on implied behavior
- dependent on code-reading to understand
- vague about nullability, defaults, or error semantics

---

## 10. Compatibility Rules

### 10.1 Backward compatibility is the default
Unless the task explicitly authorizes a breaking change, contract changes should preserve compatibility.

### 10.2 Additive changes are preferred but still require review
Even additive changes can break consumers if:
- consumers assume exhaustive enums
- consumers reject unknown fields
- analytics pipelines depend on fixed shapes
- UI logic assumes field absence

### 10.3 Breaking changes require explicit acknowledgment
A breaking change must not be merged silently.
It must document:
- why breaking is necessary
- who is affected
- required consumer updates
- rollout / sequencing plan
- fallback or mitigation if relevant

### 10.4 Deprecation beats abrupt removal
If removal is needed, prefer:
1. mark deprecated
2. support parallel path where feasible
3. migrate consumers
4. remove only after verification

### 10.5 Clarification is not a loophole
A change cannot be labeled “just clarification” if consumer behavior will need to change.

---

## 11. Design Rules for Contracts

### 11.1 Prefer explicitness over convenience
Make requiredness, nullability, defaults, and failure semantics explicit.

### 11.2 Prefer narrow contracts over oversized payloads
Do not expose fields “just in case” unless there is a concrete consumer need or a clear extensibility reason.

### 11.3 Prefer stable names
Do not rename fields for style reasons once consumers exist.

### 11.4 Prefer semantic precision
Names should reflect meaning, not internal implementation details.

### 11.5 Prefer one meaning per field
Do not overload a single field to represent multiple unrelated concepts.

### 11.6 Prefer transport-safe shared types
Shared contracts should not leak internal-only abstractions from one domain into another.

### 11.7 Prefer tolerant readers, disciplined writers
Where appropriate, consumers should tolerate additive data.
Producers should remain strict and predictable in what they emit.

### 11.8 Prefer schema-enforced interfaces where practical
When a contract is machine-consumed, use a formal schema or typed definition whenever practical.

---

## 12. Required Examples

A contract proposal or change is incomplete without examples when examples materially reduce ambiguity.

Recommended examples:
- happy-path request/response
- empty response case
- validation failure case
- authorization or permission failure if applicable
- unknown / partial / pending state if applicable
- backward-compatible additive case if relevant

Examples must match the actual agreed semantics.

---

## 13. Contract Validation Rules

A contract is not complete when merely documented.
It must be validated.

Validation may include:
- schema validation
- unit tests
- integration tests
- consumer contract tests
- golden examples / snapshots
- manual verification steps
- end-to-end flows
- telemetry/event assertions where relevant

The validation plan should cover both:
- producer compliance
- consumer interpretation

If either side is unverified, the gap must be documented explicitly.

---

## 14. Review Thresholds

### 14.1 Producer-only review is sufficient when
- the contract is local and has no external consumer
- or the change is fully internal to one owned boundary

### 14.2 Consumer review is required when
- the contract is already consumed by another domain
- the usability of the contract depends on consumer interpretation
- the change modifies semantics, not just implementation

### 14.3 Joint review is required when
- request/response shapes change
- shared types change
- telemetry/event schemas change
- compatibility expectations change
- rollout sequencing matters
- a breaking or potentially breaking change is proposed

### 14.4 Human approval is required for high-impact changes
This includes changes involving:
- auth / permission semantics
- billing or entitlement semantics
- destructive actions
- security-sensitive payloads
- privacy-sensitive data flows
- code generation or automation that can trigger downstream actions

---

## 15. Rollout and Sequencing Rules

If contract changes require both producer and consumer updates, sequencing must be explicit.

Preferred order for non-breaking rollout:
1. extend producer safely
2. verify compatibility
3. update consumer
4. remove old path only after confirmation

For breaking changes, define:
- exact cutover condition
- migration owner
- fallback if cutover fails
- how old and new paths are verified during transition

No agent should assume “both sides will land together” unless the task explicitly says so.

---

## 16. Handoff Requirements for Contract Work

Any task involving contract creation or change must leave a structured handoff or completion note containing:

- contract source of truth
- change classification
- final agreed semantics
- files changed
- affected consumers
- required next actions
- verification performed
- verification not performed
- known risks or follow-ups

A consumer should be able to continue integration without reconstructing intent from diffs alone.

---

## 17. Failure Modes and Anti-Patterns

The following are considered contract-process failures:

- implementing producer and consumer logic before contract alignment
- documenting only field shape and omitting semantics
- treating optional and nullable as interchangeable
- using examples that contradict actual behavior
- labeling a semantic change as “minor”
- changing error behavior without documenting it
- widening a contract casually because it is “convenient”
- making breaking changes under a generic refactor
- relying on verbal agreement with no versioned record
- considering a contract “done” without verification

---

## 18. Minimal Contract Checklist

Before approval:
- Is the source of truth clear?
- Is the change type classified?
- Are shape and semantics both defined?
- Are compatibility expectations explicit?
- Are examples provided where needed?
- Is validation defined?

Before implementation:
- Has the contract been approved?
- Are open questions resolved or explicitly marked?
- Is sequencing clear?

Before completion:
- Was the agreed contract actually implemented?
- Were producer and consumer behaviors verified?
- Are migration/deprecation notes recorded if needed?
- Is the handoff or completion note sufficient for downstream work?

---

## 19. Relationship to Other Docs

This document defines how contracts are proposed, changed, reviewed, and verified.

Related documents:
- `docs/agent/shared/operating-model.md` defines overall collaboration flow
- `docs/agent/shared/repo-boundaries.md` defines ownership and cross-boundary edit rules
- domain-specific agent docs define execution behavior within each area
- task packet templates define intake structure
- handoff templates define downstream transfer format
- Definition of Done documents define completion quality bars