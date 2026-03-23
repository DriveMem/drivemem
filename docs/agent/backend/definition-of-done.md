
## 1. Purpose

This document defines the minimum completion standard for backend work in this repository.

A backend task is considered done only when it is:
- implemented within approved scope
- semantically correct for consumers
- aligned with the agreed contract
- safe in terms of data, auth, and operational behavior
- verified to the required level
- documented well enough for downstream owners to continue safely

“Code compiles” is not sufficient.
“Endpoint returns something” is not sufficient.
“Happy path works locally” is not sufficient.

Done means the backend behavior is explicit, reviewable, verifiable, and safe for integration or release at the appropriate quality bar.

---

## 2. Applicability

This Definition of Done applies to all backend tasks unless:
- the task packet defines a stricter requirement
- a more specific subdirectory rule overrides it
- the task is explicitly marked as exploratory / spike work

Exploratory work must be labeled clearly as:
- spike
- prototype
- draft
- not production-ready

Exploratory work must not be represented as production-complete.

---

## 3. Core Definition of Done

A backend task is done only when all applicable items below are satisfied.

### 3.1 Scope is complete
- The implementation matches the approved task scope.
- Acceptance criteria in the task packet are addressed.
- Out-of-scope changes have not been silently bundled in.
- Any intentionally deferred work is explicitly labeled.

### 3.2 Ownership boundaries are respected
- Changes stay primarily within backend-owned boundaries.
- Any cross-boundary edit is minimal, justified, and documented.
- No foreign-domain semantic change has been made silently.

### 3.3 Contract usage is explicit
- The backend implementation uses an approved contract or a clearly documented contract assumption.
- Request / response expectations are recorded.
- Relevant semantics are explicit, including:
  - required vs optional vs nullable fields
  - status / state meanings
  - error semantics
  - retry / idempotency expectations
  - ordering / filtering / pagination behavior if applicable
  - backward compatibility expectations

### 3.4 Backend semantics are complete for scope
The backend behavior required by the task is implemented, including all relevant cases:
- valid input and success path
- invalid input / validation failure
- missing data / not found
- unauthorized / forbidden
- conflict / duplicate / stale-update behavior if relevant
- dependency failure or degraded behavior if relevant
- retryable vs terminal failure if relevant
- queued / processing / partial completion states if relevant

If a case is intentionally not implemented, the omission must be documented and justified by scope.

### 3.5 Data and persistence behavior is safe
Where applicable:
- schema changes are implemented correctly
- migration behavior is understood
- existing data compatibility is considered
- write-path changes are intentional
- stale writes / duplicate writes / concurrency effects are considered
- rollback or forward-fix expectations are documented where relevant

### 3.6 Auth / permission / safety behavior is correct
Where applicable:
- authentication behavior is intentional
- authorization checks are correct
- destructive actions are guarded appropriately
- entitlement / billing gating is handled correctly
- privacy-sensitive payloads are treated appropriately
- export / delete / mutation behavior is explicit

If auth / safety is affected, “probably unchanged” is not an acceptable completion standard.

### 3.7 Failure behavior is explicit
The backend does not only implement the happy path.
Where applicable, it intentionally defines:
- validation failures
- dependency failures
- timeout behavior
- retry safety
- duplicate request behavior
- partial failure behavior
- fallback / degradation behavior

### 3.8 Observability is sufficient
Where appropriate:
- logs, metrics, traces, telemetry, or health signals exist or remain correct
- observability changes are documented
- critical backend behavior is inspectable during verification or after rollout

### 3.9 Backend code quality is acceptable
- Code is understandable and scoped to the task.
- Existing repository conventions are followed.
- New abstractions are justified by real clarity or reuse.
- Dead code, debug artifacts, and commented-out production code are removed.
- The implementation does not rely on undocumented hidden behavior.

### 3.10 Operational behavior is acceptable
Where applicable:
- performance-sensitive paths are treated intentionally
- rate limiting / throttling implications are considered
- queue / async behavior is coherent
- rollout sequencing is considered if producer and consumer must land safely
- known operational risks are documented

### 3.11 Tests and verification are sufficient
The task has been verified to the level appropriate for its risk and scope.

Possible verification includes:
- unit tests
- integration tests
- contract tests
- migration tests
- local/manual endpoint validation
- invalid input and failure-path validation
- auth / permission validation
- retry / duplicate request validation
- lint / typecheck / build
- log / metric / trace inspection
- staging / preview validation
- end-to-end validation with consumers

The exact verification performed must be recorded.
Anything not verified must also be recorded.

### 3.12 No hidden blockers remain
- Known blockers are either resolved or explicitly documented.
- Open questions are visible to the next owner.
- No unresolved issue is buried in the implementation and left unmentioned.

### 3.13 Handoff / completion note exists when needed
A structured handoff or completion note is required when:
- another agent must continue the work
- frontend or another consumer must integrate next
- contract assumptions remain relevant
- migration notes matter
- verification is partial
- rollout or release coordination is needed

The next owner should not need to reconstruct context from diffs alone.

---

## 4. Required Completion Evidence

A backend task is not done unless there is evidence proportionate to the task.

### 4.1 Minimum evidence for most tasks
- summary of what changed
- files / modules / backend surfaces affected
- contract used or changed
- verification performed
- verification not performed
- open questions or “None”
- blockers or “None”

### 4.2 Additional evidence for higher-risk tasks
For tasks involving contract changes, data changes, auth/safety impact, or wide operational impact, include as applicable:
- API examples
- schema / contract diffs
- migration notes or output
- test output
- logs / metrics / trace evidence
- staging / preview notes
- rollout / compatibility notes
- auth / permission validation notes

---

## 5. Completion Levels

Not all backend tasks need the same release confidence, but they must be labeled correctly.

### 5.1 Production-complete
Use only when:
- scoped implementation is complete
- verification is sufficient for intended rollout stage
- no material blocker remains
- downstream owners can proceed immediately

### 5.2 Ready for integration
Use when:
- backend implementation is complete for current scope
- contract assumptions are stable enough
- frontend or another consumer integrating next is the primary next step
- any missing dependency is clearly documented

### 5.3 Ready for verification
Use when:
- implementation is complete for current scope
- major blockers are cleared
- QA / reviewer / release validation is the primary next step

### 5.4 Partial completion
Use when:
- part of the scoped work is complete
- remaining work is explicitly listed
- blockers / dependencies are documented
- the task is not falsely presented as done

### 5.5 Prototype / spike
Use when:
- the goal is learning or exploration
- production hardening is intentionally incomplete
- the limitations are made explicit

---

## 6. A Backend Task Is NOT Done If…

A backend task is not done if any of the following is true:

- the implementation depends on an unstated contract assumption
- acceptance criteria were only partially addressed without disclosure
- failure behavior was ignored even though relevant
- migration or existing data impact was not considered even though relevant
- auth / permission changes are unclear
- retry / duplicate request behavior is undefined in a mutating flow
- the next owner must inspect the diff to figure out what changed
- verification was not performed and not disclosed
- blockers exist but are not documented
- cross-boundary semantics were changed silently
- observability behavior changed without disclosure
- the task works only in the happy path but is presented as complete
- placeholder logic, temporary mocks, or compatibility shims remain without being called out
- the task is “code complete” but not integration-ready, verification-ready, or honestly labeled as partial

---

## 7. Verification Expectations by Task Type

### 7.1 Local backend logic change
At minimum:
- scoped functional validation
- at least one relevant failure path if applicable
- lint / typecheck / build if applicable
- regression awareness for nearby logic

### 7.2 API or contract-sensitive change
At minimum:
- agreed contract reference
- request / response semantics recorded
- invalid input behavior checked
- compatibility impact checked
- integration validation or explicitly documented gap

### 7.3 Data-shape / migration change
At minimum:
- migration behavior understood
- existing data compatibility considered
- rollback or forward-fix note where relevant
- read/write behavior validated for affected paths

### 7.4 Auth / permission / destructive flow change
At minimum:
- explicit validation of allowed and denied cases
- failure behavior checked
- no silent privilege expansion
- reviewer confidence evidence appropriate to risk

### 7.5 Queue / async / eventual consistency change
At minimum:
- state transition behavior checked
- duplicate / retry behavior considered
- partial failure or delayed completion semantics documented
- observability for key transitions confirmed where relevant

### 7.6 Critical user or business flow
At minimum:
- higher-confidence validation
- edge-case coverage
- compatibility and rollback awareness
- evidence suitable for reviewer / release owner confidence

---

## 8. Operational and Safety Minimum Bar

Unless explicitly out of scope, backend completion should include a practical check for operational and safety implications.

Minimum practical bar:
- mutating behavior is intentional
- failure handling is not undefined
- auth / permission behavior is not ambiguous
- critical logs / signals are not silently broken
- duplicate or retried requests do not create surprising side effects where this matters
- compatibility risks are visible

This is a minimum bar, not a substitute for dedicated security, privacy, or reliability review when required.

---

## 9. Documentation Expectations

Backend completion should leave enough context for another person or agent to continue safely.

Required documentation depends on scope, but may include:
- task packet updates
- handoff note
- contract notes
- migration notes
- verification notes
- rollout notes
- known gaps / follow-ups

Documentation should be concise, explicit, and implementation-relevant.

---

## 10. Risk Disclosure

If the task carries meaningful risk, completion requires explicit disclosure.

Common backend risk areas:
- contract ambiguity
- migration safety
- stale consumer assumptions
- duplicate side effects on retry
- auth regression
- privacy-sensitive payload handling
- queue / async inconsistency
- partial failure handling gap
- insufficient observability
- rollout mismatch
- performance regression
- data compatibility issue

For each material risk, document:
- what the risk is
- where it may appear
- mitigation or fallback
- whether the risk blocks completion or only affects rollout confidence

---

## 11. Relationship to Handoff

A task may be done for the current backend owner but still require handoff.

Backend work should not be marked “fully done” when:
- frontend or another consumer still needs to integrate against new behavior
- QA still needs targeted validation for risky scenarios
- another backend owner must complete documented follow-up work
- release owner signoff is still required for rollout-sensitive behavior
- migration / compatibility observation is still pending

In such cases, use the most accurate completion level:
- Ready for integration
- Ready for verification
- Partial completion
- Production-complete

Do not overstate completion.

---

## 12. Minimal Backend Done Checklist

Before marking work done, confirm:

### Scope
- [ ] The scoped implementation is complete
- [ ] Acceptance criteria are addressed
- [ ] Out-of-scope items are not silently included
- [ ] Deferred items are explicitly labeled

### Contract
- [ ] The contract used or changed is identified
- [ ] Contract assumptions are documented
- [ ] Success / error / retry semantics are defined
- [ ] No silent semantic change was introduced

### Data / Safety
- [ ] Data or migration impact is handled or explicitly not applicable
- [ ] Auth / permission / destructive impact is handled or explicitly not applicable
- [ ] Failure behavior is intentional
- [ ] Operational implications were checked where relevant

### Quality
- [ ] Code follows repository conventions
- [ ] Dead / debug code is removed
- [ ] Observability impact is handled or explicitly out of scope
- [ ] Compatibility impact is documented where relevant

### Verification
- [ ] Verification performed is documented
- [ ] Verification not performed is documented
- [ ] Evidence is attached or referenced where appropriate
- [ ] Known risks / blockers are documented

### Handoff
- [ ] The next owner can continue without reconstructing context
- [ ] Handoff exists if another owner must act next
- [ ] Completion level is labeled accurately

---

## 13. Relationship to Other Docs

This document defines the completion bar for backend work.

Related documents:
- `docs/agent/shared/operating-model.md` defines collaboration flow
- `docs/agent/shared/repo-boundaries.md` defines ownership and cross-boundary rules
- `docs/agent/shared/contract-first-policy.md` defines contract creation and change policy
- `docs/agent/backend/handoff-template.md` defines how backend work is transferred
- `docs/agent/backend/task-packet-template.md` defines backend task intake structure
- `docs/agent/backend/backend-agent.md` defines backend agent role and execution expectations