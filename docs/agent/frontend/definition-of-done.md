
## 1. Purpose

This document defines the minimum completion standard for frontend work in this repository.

A frontend task is considered done only when it is:
- implemented within approved scope
- aligned with the agreed contract
- verified to the required level
- documented for downstream consumers
- ready for review, integration, or release at the appropriate quality bar

“Code written” is not sufficient.
“Looks correct locally” is not sufficient.
“Likely works” is not sufficient.

Done means the work is explicit, reviewable, and usable by the next owner without hidden assumptions.

---

## 2. Applicability

This Definition of Done applies to all frontend tasks unless:
- the task packet defines a stricter requirement
- a more specific subdirectory rule overrides it
- the task is explicitly marked as exploratory / spike work

For exploratory work, the task must be labeled clearly as:
- spike
- prototype
- draft
- not production-ready

Exploratory work must not be presented as production-complete.

---

## 3. Core Definition of Done

A frontend task is done only when all applicable items below are satisfied.

### 3.1 Scope is complete
- The implementation matches the approved task scope.
- Acceptance criteria in the task packet are addressed.
- Out-of-scope work has not been silently bundled in.
- Any intentionally deferred work is explicitly labeled.

### 3.2 Ownership boundaries are respected
- Changes stay primarily within frontend-owned boundaries.
- Any cross-boundary edit is minimal, justified, and documented.
- No foreign-domain semantic change has been made silently.

### 3.3 Contract usage is explicit
- The frontend implementation uses an approved contract or clearly documented contract assumption.
- Request / response expectations used by the frontend are recorded.
- UI-relevant semantics are explicit, including:
  - required vs optional fields
  - nullability / empty values
  - loading / pending states
  - error states
  - retry behavior
  - ordering / pagination behavior if applicable

### 3.4 User-visible behavior is complete for scope
The user-visible behavior required by the task is implemented, including all applicable states:
- loading
- empty
- success
- partial data
- recoverable error
- terminal error
- unauthorized / forbidden
- pending / processing
- offline / retryable failure

If a state is intentionally not implemented, the omission must be documented and approved by scope.

### 3.5 UX behavior is coherent
- The feature behaves consistently with surrounding product patterns.
- Labels, copy, control states, and transitions are not misleading.
- Disabled, busy, retry, and failure behavior are understandable to the user.
- The UI does not expose raw contract ambiguity to the user unless explicitly designed to do so.

### 3.6 Accessibility is addressed to the required bar
At minimum, where applicable:
- keyboard interaction works
- focus behavior is correct
- semantics / roles / labels are present
- no obvious inaccessible interaction is introduced
- critical user actions are not mouse-only

If accessibility work is partial, the exact gap must be documented.

### 3.7 Responsive and visual behavior is acceptable
Where applicable:
- layout works at required screen sizes / containers
- no major visual regression is introduced
- truncation / overflow / wrapping is acceptable
- empty, loading, and error states remain usable in supported layouts

### 3.8 Frontend code quality is acceptable
- Code is understandable and scoped to the task.
- Existing repository conventions are followed.
- New abstractions are justified by real reuse or clarity.
- Dead code, debug artifacts, and commented-out production code are removed.
- The implementation does not rely on hidden behavior that is undocumented.

### 3.9 State management is sound
Where applicable:
- state transitions are coherent
- optimistic / pending / error / success states are handled intentionally
- stale state risk is considered
- duplicate fetches / duplicate submissions are handled appropriately
- cleanup logic exists for subscriptions, timers, listeners, or in-flight operations if needed

### 3.10 Telemetry / analytics changes are explicit
If the task affects telemetry:
- new events or fields are implemented as specified
- existing telemetry semantics are not silently changed
- trigger points are intentional
- known limitations in validation are documented

If telemetry is out of scope, say so explicitly when relevant.

### 3.11 Tests and verification are sufficient
The task has been verified to the level appropriate for its risk and scope.

Possible verification includes:
- local manual validation
- unit tests
- integration tests
- visual / snapshot tests
- mock / story validation
- E2E validation
- lint / typecheck / build
- feature-flag behavior checks
- analytics verification

The exact verification performed must be recorded.
Anything not verified must also be recorded.

### 3.12 No hidden blockers remain
- Known blockers are either resolved or explicitly documented.
- Open questions are visible to the next owner.
- No unresolved issue is buried inside the implementation and left unmentioned.

### 3.13 Handoff / completion note exists when needed
A structured handoff or completion note is required when:
- another agent must continue the work
- backend or QA must act next
- contract assumptions remain relevant
- verification is partial
- rollout or release coordination is needed

The next owner should not need to reconstruct context from diffs alone.

---

## 4. Required Completion Evidence

A frontend task is not done unless there is evidence proportionate to the task.

### 4.1 Minimum evidence for most tasks
- summary of what changed
- files / surfaces affected
- verification performed
- verification not performed
- open questions or “None”
- blockers or “None”

### 4.2 Additional evidence for higher-risk tasks
For tasks involving contract changes, critical flows, or wide user impact, include as applicable:
- screenshots
- screen recording
- API / mock examples
- test output
- feature flag notes
- analytics validation notes
- responsive behavior notes
- accessibility spot-check notes

---

## 5. Completion Levels

Not all frontend tasks need the same bar of evidence, but they must be labeled correctly.

### 5.1 Production-complete
Use only when:
- scoped implementation is complete
- verification is sufficient for intended rollout stage
- no material blocker remains
- downstream owners can proceed immediately

### 5.2 Ready for integration
Use when:
- frontend implementation is complete for current scope
- contract assumptions are stable enough
- integration with backend / shared systems is the next step
- any missing dependency is clearly documented

### 5.3 Ready for verification
Use when:
- implementation is complete for current scope
- major blockers are cleared
- QA / reviewer validation is the primary next step

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

## 6. A Frontend Task Is NOT Done If…

A frontend task is not done if any of the following is true:

- the implementation depends on an unstated contract assumption
- acceptance criteria were only partially addressed without disclosure
- loading / error / empty behavior was ignored even though relevant
- the next owner must inspect the diff to figure out what changed
- verification was not performed and not disclosed
- blockers exist but are not documented
- cross-boundary semantics were changed silently
- the feature works only in the happy path but is presented as complete
- placeholder logic or temporary mocks remain without being called out
- accessibility or layout regressions were introduced and not documented
- telemetry behavior changed without disclosure
- the task is “code complete” but not integration-ready, verification-ready, or honestly labeled as partial

---

## 7. Verification Expectations by Task Type

### 7.1 Pure presentation change
At minimum:
- visual/manual validation
- relevant layout/responsive check
- lint / typecheck if applicable
- regression check for nearby UI

### 7.2 Interaction change
At minimum:
- happy path validation
- failure or invalid-state validation
- control state validation
- keyboard/focus sanity check where relevant

### 7.3 Data-driven UI change
At minimum:
- loading / empty / success / error coverage
- contract assumption check
- integration or mock-data validation
- stale / retry / refresh behavior considered where relevant

### 7.4 Contract-sensitive frontend integration
At minimum:
- agreed contract reference
- consumer assumption record
- integration validation or clearly documented gap
- explicit handoff to backend / QA / reviewer if applicable

### 7.5 Critical user flow
At minimum:
- higher-confidence validation
- edge-case coverage
- regression awareness
- evidence suitable for reviewer / release owner confidence

---

## 8. Accessibility and UX Minimum Bar

Unless explicitly out of scope, frontend completion should include a practical accessibility and UX check.

Minimum practical bar:
- interactive controls are reachable
- focus is visible and not lost unexpectedly
- meaningful labels / text are present
- error messaging is understandable
- loading and disabled states are not misleading
- core interactions are usable without requiring perfect visual conditions

This is a minimum bar, not a substitute for dedicated accessibility review when required.

---

## 9. Documentation Expectations

Frontend completion should leave enough context for another person or agent to continue safely.

Required documentation depends on scope, but may include:
- task packet updates
- handoff note
- component / story updates
- mock or contract notes
- test notes
- rollout notes
- known gaps / follow-ups

Documentation should be concise, explicit, and implementation-relevant.

---

## 10. Risk Disclosure

If the task carries meaningful risk, completion requires explicit disclosure.

Common frontend risk areas:
- contract ambiguity
- stale state
- race conditions
- retry duplication
- visual regression
- accessibility regression
- feature flag mismatch
- telemetry misfire
- mobile / narrow layout issues
- backend dependency mismatch
- partial rollout behavior differences

For each material risk, document:
- what the risk is
- where it may appear
- mitigation or fallback
- whether the risk blocks completion or only affects rollout confidence

---

## 11. Relationship to Handoff

A task may be done for the current frontend owner but still require handoff.

Frontend work should not be marked “fully done” when:
- backend still needs to confirm semantics
- QA still needs targeted verification for risky scenarios
- another frontend owner must complete documented follow-up work
- release owner signoff is still required for rollout-sensitive behavior

In such cases, use the most accurate completion level:
- Ready for integration
- Ready for verification
- Partial completion
- Production-complete

Do not overstate completion.

---

## 12. Minimal Frontend Done Checklist

Before marking work done, confirm:

### Scope
- [ ] The scoped implementation is complete
- [ ] Acceptance criteria are addressed
- [ ] Out-of-scope items are not silently included
- [ ] Deferred items are explicitly labeled

### Contract
- [ ] The contract used is identified
- [ ] Contract assumptions are documented
- [ ] UI semantics for loading / empty / error are defined
- [ ] No silent semantic change was introduced

### UX / UI
- [ ] Required user-visible states are implemented
- [ ] Interaction behavior is coherent
- [ ] No obvious visual regression remains uncalled-out
- [ ] Accessibility basics were checked where relevant

### Quality
- [ ] Code follows repository conventions
- [ ] State transitions are intentional
- [ ] Debug / dead code is removed
- [ ] Telemetry impact is handled or explicitly out of scope

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

This document defines the completion bar for frontend work.

Related documents:
- `docs/agent/shared/operating-model.md` defines collaboration flow
- `docs/agent/shared/repo-boundaries.md` defines ownership and cross-boundary rules
- `docs/agent/shared/contract-first-policy.md` defines contract creation and change policy
- `docs/agent/frontend/handoff-template.md` defines how frontend work is transferred
- `docs/agent/frontend/task-packet-template.md` defines frontend task intake structure
- `docs/agent/frontend/frontend-agent.md` defines frontend agent role and execution expectations