
## Purpose

Use this template when frontend work is ready to hand off to:
- backend
- another frontend agent
- QA
- integration owner
- reviewer
- release owner

A handoff must make the current state understandable without requiring the next person to reconstruct intent from diffs, chat history, or memory.

---

## Handoff Metadata

- **Task title**:
- **Task / ticket / packet link**:
- **Handoff author**:
- **Date**:
- **Handoff type**:
  - [ ] Frontend → Backend
  - [ ] Frontend → Frontend
  - [ ] Frontend → QA
  - [ ] Frontend → Reviewer
  - [ ] Frontend → Release owner
- **Status**:
  - [ ] Ready for integration
  - [ ] Ready for verification
  - [ ] Blocked
  - [ ] Partial handoff
  - [ ] Final handoff

---

## 1. Goal of This Handoff

Describe in 2–5 lines:

- what user or product problem this work addresses
- what part of the frontend is now implemented
- what the receiver is expected to do next

**Example**
> This handoff delivers the frontend UI and client-side integration scaffolding for the new upload status panel. The UI states, local state handling, and client contract assumptions are implemented. Backend / integration owner needs to confirm final response semantics for `processing`, `failed`, and retry behavior before end-to-end validation.

---

## 2. What Was Completed

List only finished work.

- Implemented:
- Updated:
- Removed:
- Intentionally left unchanged:

Be concrete. Prefer file/module/component names over vague summaries.

**Example**
- Implemented upload status panel UI
- Added loading / empty / error / success states
- Wired client-side polling using current agreed API shape
- Added analytics trigger on retry click
- Left upload API semantics unchanged

---

## 3. Scope of Frontend Changes

### Files / modules changed
- ``
- ``
- ``

### Main UI surfaces affected
- page / route:
- component(s):
- modal / panel / dialog:
- client state store / hook:
- analytics / telemetry:
- tests:
- docs / stories / mocks:

### Out of scope
- 
- 
- 

---

## 4. Contract Used

Document the frontend contract used for implementation.

- **Contract source of truth**:
- **Contract version / reference**:
- **Change type**:
  - [ ] Existing contract used as-is
  - [ ] Clarified contract
  - [ ] Additive contract change
  - [ ] Pending contract decision
- **Consumer assumption level**:
  - [ ] Confirmed
  - [ ] Proposed
  - [ ] Assumed
  - [ ] Blocked by ambiguity

### Request / response assumptions used by frontend
- 
- 
- 

### UI-relevant semantics assumed
- required vs optional fields:
- null / empty behavior:
- loading / pending semantics:
- retry semantics:
- error semantics:
- ordering / pagination semantics if any:

If any item above is not confirmed, label it clearly.

---

## 5. User-Visible Behavior Implemented

Describe exactly what the user can now do and see.

### Supported flows
- 
- 
- 

### States implemented
- [ ] loading
- [ ] empty
- [ ] success
- [ ] partial data
- [ ] recoverable error
- [ ] terminal error
- [ ] unauthorized / forbidden
- [ ] offline / retryable network failure
- [ ] pending / processing

### Notes on behavior
- 
- 
- 

Do not mix implemented behavior with proposed future behavior.

---

## 6. What Is Still Needed From the Receiver

Be explicit and action-oriented.

### If handing to backend
- confirm / implement:
- fields or semantics to finalize:
- server-side error cases needed:
- sequencing / rollout dependency:

### If handing to QA
- scenarios to verify:
- edge cases to prioritize:
- environments required:
- known unstable areas:

### If handing to another frontend agent
- remaining UI work:
- unresolved UX decisions:
- follow-up cleanup / refactor:
- missing visual polish / accessibility work:

### If handing to reviewer / release owner
- approval needed on:
- rollout concern:
- risk requiring signoff:

---

## 7. Open Questions / Ambiguities

List only unresolved items.

- **Question**:
  - current assumption:
  - impact if assumption is wrong:
  - owner to resolve:

- **Question**:
  - current assumption:
  - impact if assumption is wrong:
  - owner to resolve:

If there are no open questions, write:
> None.

---

## 8. Risks

Call out only real risks, not generic warnings.

For each risk include:
- **Risk**:
- **Impact area**:
- **Likelihood**:
- **Mitigation / fallback**:
- **Who should care**:

Common frontend risk categories:
- contract ambiguity
- stale client assumptions
- error-state mismatch
- loading-state flicker
- analytics misfire
- accessibility gap
- visual regression
- responsive layout regression
- feature flag dependency
- partial rollout mismatch

---

## 9. Verification Performed

Document what was actually verified.

### Manual verification
- [ ] local happy path
- [ ] local error path
- [ ] loading state
- [ ] empty state
- [ ] retry path
- [ ] responsive layout
- [ ] keyboard navigation
- [ ] screen reader / accessibility spot check
- [ ] feature flag behavior
- [ ] analytics event firing checked
- [ ] cross-browser spot check

Notes:
- 
- 
- 

### Automated verification
- unit tests:
- integration tests:
- visual / snapshot tests:
- E2E tests:
- lint / typecheck / build:
- story / mock verification:

### Not verified
- 
- 
- 

Be precise. “Not verified” is acceptable. Hidden gaps are not.

---

## 10. Evidence

Attach or reference concrete evidence where useful.

- screenshots:
- screen recording:
- Storybook / mock link:
- test output:
- PR / diff link:
- build / preview link:
- relevant logs:
- analytics validation notes:

---

## 11. Known Gaps

These are known non-blocking gaps that do not prevent handoff, but should not be forgotten.

- 
- 
- 

Examples:
- copy still placeholder
- mobile spacing needs design pass
- empty-state illustration not final
- backend still returns generic error codes
- analytics event name pending final approval

---

## 12. Blockers

Use only for actual blockers.

- **Blocker**:
- **Why blocked**:
- **What is unblocked already**:
- **Who owns next step**:

If none:
> None.

---

## 13. Recommended Next Step

Choose one clear next step.

- [ ] Backend implements / confirms contract semantics
- [ ] QA runs validation
- [ ] Another frontend agent completes follow-up UI work
- [ ] Reviewer checks boundary-sensitive changes
- [ ] Release owner evaluates rollout readiness
- [ ] Wait for decision on open question

Add 1–3 lines:
- what should happen next
- what should not be changed yet
- what evidence would mark the next step complete

---

## 14. Completion Statement

Use one of the following and keep only the applicable one.

### Option A — Ready for next owner
> Frontend implementation for the scoped feature is complete within current contract assumptions and is ready for the next owner listed above.

### Option B — Partial handoff
> Frontend implementation is partially complete. The completed portions are listed above, and the remaining work / blockers are explicitly documented.

### Option C — Ready for verification
> Frontend implementation is complete for the scoped task and is ready for validation against the scenarios listed above.

---

## Handoff Quality Checklist

Before sending this handoff, confirm:

- [ ] I described what was completed, not just what I intended to do
- [ ] I listed exact files / surfaces affected
- [ ] I documented the contract used and any assumptions
- [ ] I separated implemented behavior from proposed behavior
- [ ] I listed what the receiver must do next
- [ ] I documented verification performed and not performed
- [ ] I called out real risks and blockers
- [ ] The next owner can continue without reconstructing context from chat history
---

## 15. Relationship to Other Docs

This template defines the handoff format for frontend tasks.

Related documents:
- `docs/agent/frontend/frontend-agent.md` defines frontend agent execution rules
- `docs/agent/frontend/task-packet-template.md` defines task intake structure
- `docs/agent/frontend/definition-of-done.md` defines completion quality bar
- `docs/agent/shared/operating-model.md` defines collaboration flow and handoff model
- `docs/agent/shared/contract-first-policy.md` defines contract lifecycle rules
- `docs/agent/shared/repo-boundaries.md` defines ownership and cross-boundary edit rules
