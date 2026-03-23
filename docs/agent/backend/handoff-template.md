
## Purpose

Use this template when backend work is ready to hand off to:
- frontend
- another backend agent
- QA
- reviewer
- release owner
- data / analytics owner
- security / privacy reviewer

A backend handoff must make the current implementation state understandable and actionable without requiring the next owner to reconstruct intent from diffs, chat history, or undocumented assumptions.

---

## Handoff Metadata

- **Task title**:
- **Task / ticket / packet link**:
- **Handoff author**:
- **Date**:
- **Handoff type**:
  - [ ] Backend → Frontend
  - [ ] Backend → Backend
  - [ ] Backend → QA
  - [ ] Backend → Reviewer
  - [ ] Backend → Release owner
  - [ ] Backend → Data / Analytics owner
  - [ ] Backend → Security / Privacy reviewer
- **Status**:
  - [ ] Ready for integration
  - [ ] Ready for verification
  - [ ] Blocked
  - [ ] Partial handoff
  - [ ] Final handoff

---

## 1. Goal of This Handoff

Describe in 2–5 lines:
- what backend problem this work addresses
- what backend capability or behavior is now implemented
- what the receiver is expected to do next

**Example**
> This handoff delivers the backend endpoint and state model for document processing status. Request validation, persistence updates, and `queued` / `processing` / `ready` / `failed` semantics are implemented. Frontend now needs to integrate the response states and QA should validate retry behavior and stale-status handling.

---

## 2. What Was Completed

List only finished work.

- Implemented:
- Updated:
- Removed:
- Intentionally left unchanged:

Be concrete. Prefer endpoint / handler / job / module names over vague summaries.

**Example**
- Implemented `GET /documents/:id/status`
- Added validation for invalid document ID input
- Added `processing_state` persistence field
- Added retry-safe update logic for duplicate processing callbacks
- Left frontend polling strategy unchanged

---

## 3. Scope of Backend Changes

### Files / modules changed
- ``
- ``
- ``

### Main backend surfaces affected
- endpoint / route:
- handler / controller:
- service / domain logic:
- persistence / schema / migration:
- queue / job / worker:
- auth / permission logic:
- telemetry / logging / metrics:
- tests:
- docs / schemas / mocks:

### Out of scope
-
-
-

---

## 4. Contract Used or Changed

Document the backend contract used or implemented.

- **Contract source of truth**:
- **Contract version / reference**:
- **Change type**:
  - [ ] No shared contract impact
  - [ ] Existing contract used as-is
  - [ ] Clarified contract
  - [ ] Additive contract change
  - [ ] Modifying contract change
  - [ ] Breaking contract change
  - [ ] New contract
- **Contract confidence level**:
  - [ ] Confirmed
  - [ ] Proposed
  - [ ] Assumed
  - [ ] Blocked by ambiguity

### Request semantics
-
-
-

### Response semantics
-
-
-

### Required / optional / nullable behavior
-
-
-

### Error semantics
-
-
-

### Retry / idempotency semantics
-
-
-

### Ordering / filtering / pagination semantics if applicable
-
-
-

If any item above is not confirmed, label it clearly.

---

## 5. Data / Persistence Impact

State exactly what changed in storage or data interpretation.

### Impact type
- [ ] No data impact
- [ ] Read-path only
- [ ] Write-path behavior change
- [ ] Schema change
- [ ] Migration required
- [ ] Backfill required
- [ ] Data interpretation change
- [ ] Index / performance-sensitive persistence change

### Details
- affected entities / tables / collections:
- schema / migration applied:
- existing record behavior:
- compatibility expectations:
- rollback or forward-fix note:
- concurrency / stale-write note:

### Notes for receiver
-
-
-

---

## 6. Auth / Permission / Safety Impact

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

### What changed
-
-
-

### Failure mode if incorrect
-
-
-

### Who should review carefully
-
-
-

If none:
> None.

---

## 7. User- or Consumer-Visible Behavior Enabled by Backend

Describe the behavior that downstream consumers can now rely on.

### Supported behaviors
-
-
-

### States / outcomes implemented
- [ ] success
- [ ] validation failure
- [ ] unauthorized
- [ ] forbidden
- [ ] not found
- [ ] conflict
- [ ] retryable failure
- [ ] terminal failure
- [ ] queued / pending
- [ ] processing / partial completion

### Notes on semantics
-
-
-

Do not mix implemented behavior with future proposed behavior.

---

## 8. What Is Still Needed From the Receiver

Be explicit and action-oriented.

### If handing to frontend
- integrate:
- confirm UI assumptions:
- edge cases to handle:
- feature flag / rollout dependency:

### If handing to another backend owner
- remaining backend work:
- unresolved semantic decisions:
- follow-up migration / cleanup:
- operational hardening still needed:

### If handing to QA
- scenarios to verify:
- environments required:
- risk areas to focus on:
- known unstable areas:

### If handing to reviewer / release owner
- approval needed on:
- rollout risk:
- compatibility / migration concern:
- monitoring required after release:

### If handing to data / analytics owner
- event / schema updates to validate:
- downstream pipeline assumption to check:
- historical compatibility concern:

### If handing to security / privacy reviewer
- payload / access path to review:
- policy or compliance concern:
- review trigger:

---

## 9. Open Questions / Ambiguities

List only unresolved items.

- **Question**:
  - current assumption:
  - impact if assumption is wrong:
  - owner to resolve:

- **Question**:
  - current assumption:
  - impact if assumption is wrong:
  - owner to resolve:

If none:
> None.

---

## 10. Risks

Call out only real risks.

For each risk include:
- **Risk**:
- **Impact area**:
- **Likelihood**:
- **Mitigation / fallback**:
- **Who should care**:

Common backend risk categories:
- contract ambiguity
- migration safety
- duplicate side effects on retry
- stale consumer assumptions
- auth regression
- queue / async inconsistency
- partial failure handling gap
- insufficient observability
- rollout mismatch
- data compatibility issue

---

## 11. Verification Performed

Document what was actually verified.

### Manual / runtime verification
- [ ] local happy path
- [ ] invalid input path
- [ ] unauthorized / forbidden path
- [ ] not found path
- [ ] retry / duplicate request behavior
- [ ] queue / async processing path
- [ ] migration outcome
- [ ] log / metric / trace inspection
- [ ] feature flag behavior
- [ ] staging / preview validation

Notes:
-
-
-

### Automated verification
- unit tests:
- integration tests:
- contract tests:
- migration tests:
- lint / typecheck / build:
- E2E / consumer validation:
- other:

### Not verified
-
-
-

Be precise. “Not verified” is acceptable. Hidden gaps are not.

---

## 12. Evidence

Attach or reference concrete evidence where useful.

- API examples:
- schema / contract diff:
- migration output:
- test output:
- logs / metrics / traces:
- staging / preview link:
- PR / diff link:
- dashboard / monitor reference:
- issue / follow-up link:

---

## 13. Known Gaps

These are known non-blocking gaps that do not prevent handoff but must remain visible.

-
-
-

Examples:
- frontend still assumes generic error copy
- migration was validated only on sample data
- observability dashboards not yet updated
- old enum values still accepted temporarily for compatibility
- rate-limit behavior not load-tested yet

---

## 14. Blockers

Use only for actual blockers.

- **Blocker**:
- **Why blocked**:
- **What is already unblocked**:
- **Who owns next step**:

If none:
> None.

---

## 15. Recommended Next Step

Choose one clear next step.

- [ ] Frontend integrates new backend behavior
- [ ] Another backend owner completes follow-up backend work
- [ ] QA runs targeted verification
- [ ] Reviewer checks boundary-sensitive or risk-sensitive changes
- [ ] Release owner evaluates rollout readiness
- [ ] Data / analytics owner validates downstream compatibility
- [ ] Security / privacy reviewer signs off
- [ ] Wait for decision on open question

Add 1–3 lines:
- what should happen next
- what should not be changed yet
- what evidence would mark the next step complete

---

## 16. Completion Statement

Use one of the following and keep only the applicable one.

### Option A — Ready for next owner
> Backend implementation for the scoped task is complete within the documented contract assumptions and is ready for the next owner listed above.

### Option B — Partial handoff
> Backend implementation is partially complete. The completed portions are listed above, and the remaining work / blockers are explicitly documented.

### Option C — Ready for verification
> Backend implementation is complete for the scoped task and is ready for validation against the scenarios listed above.

---

## Handoff Quality Checklist

Before sending this handoff, confirm:

- [ ] I described what was completed, not just what I intended to do
- [ ] I listed exact files / modules / backend surfaces affected
- [ ] I documented the contract used or changed
- [ ] I documented data / migration impact where relevant
- [ ] I documented auth / safety impact where relevant
- [ ] I separated implemented behavior from proposed behavior
- [ ] I listed exactly what the receiver must do next
- [ ] I documented verification performed and not performed
- [ ] I called out real risks, blockers, and open questions
- [ ] The next owner can continue without reconstructing context from chat history
---

## 17. Relationship to Other Docs

This template defines the handoff format for backend tasks.

Related documents:
- `docs/agent/backend/backend-agent.md` defines backend agent execution rules
- `docs/agent/backend/task-packet-template.md` defines task intake structure
- `docs/agent/backend/definition-of-done.md` defines completion quality bar
- `docs/agent/shared/operating-model.md` defines collaboration flow and handoff model
- `docs/agent/shared/contract-first-policy.md` defines contract lifecycle rules
- `docs/agent/shared/repo-boundaries.md` defines ownership and cross-boundary edit rules
