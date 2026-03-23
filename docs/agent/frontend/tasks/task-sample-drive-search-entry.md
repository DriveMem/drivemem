# Frontend Task Packet — Sample: Drive Search Entry in Edge Extension

## Task Metadata

- **Task title**: Add Drive Search entry UI in the Edge extension
- **Task / ticket ID**: task-sample-drive-search-entry
- **Owner / requester**: Product / Extension UX
- **Primary frontend owner**: Frontend
- **Related agents / teams**: Backend, QA
- **Priority**:
  - [ ] P0
  - [x] P1
  - [ ] P2
  - [ ] P3
- **Status**:
  - [ ] Draft
  - [x] Ready for implementation
  - [ ] Blocked
  - [ ] In progress
  - [ ] Ready for review
  - [ ] Done
- **Target milestone / release**: v1 internal milestone
- **Related docs / links**:
  - `docs/agent/frontend/task-packet-template.md`
  - `docs/agent/shared/operating-model.md`
  - `docs/agent/shared/contract-first-policy.md`
  - `docs/agent/backend/tasks/task-sample-drive-search-api.md`

---

## 1. Problem Statement

Users of the Edge extension do not currently have a direct entry point to search files stored in AI Drive.

The extension can surface navigation and static UI, but there is no task flow that lets a user:
- enter a file query
- trigger a backend search
- see loading, empty, success, and failure states
- open or inspect matching items from within the extension

Frontend work is needed to create the search entry experience and make backend search behavior consumable from the extension UI.

---

## 2. Goal

Deliver a first usable Drive Search entry experience inside the Edge extension.

After this task:
- users can type a search query in the extension
- users can submit the query
- the extension can show loading, empty, success, and error states
- the extension can render result items returned by the backend contract
- the extension can display enough metadata for a user to understand which file they found

This task does not try to solve advanced ranking, file preview, or bulk actions.

---

## 3. Scope

### In scope
- Add a Drive Search input area to the extension UI
- Add submit behavior for search
- Add client-side request wiring to the agreed backend search contract
- Render loading / empty / success / error states
- Render a basic result list with file name, file type, and updated time
- Support retry after recoverable request failure
- Support basic analytics trigger for search submit and result click if analytics wiring already exists in the extension

### Out of scope
- File preview
- Folder tree navigation
- Filter chips or advanced search syntax
- Infinite scroll or pagination UI
- Offline cache
- Query suggestions
- Saved searches

### Non-goals
- Reworking global extension navigation
- Creating a new design system pattern
- Replacing existing extension state architecture
- Changing backend ranking logic

---

## 4. Current State

Relevant current behavior:
- The extension has existing shell UI and authenticated user context
- There is no Drive Search entry surface yet
- There is no result-list UI for drive search results
- There is no current frontend contract consumer for file search
- Error and loading patterns exist elsewhere in the extension and should be reused where practical

Known limitations:
- No agreed final API yet for search results until backend sample task lands
- Empty state and error copy may need placeholder text initially if product copy is not finalized

---

## 5. Desired End State

After completion:
- A user can open the extension and find a visible Drive Search input
- A user can submit a non-empty query
- The UI shows a loading state while request is in flight
- The UI shows:
  - success with results
  - empty state when no file matches
  - recoverable error state for retryable failures
  - terminal error state when appropriate
- Each result item shows at minimum:
  - file id
  - display name
  - file type
  - updated time
- Clicking a result triggers the next defined action for the extension flow, or a placeholder action if the downstream open behavior is intentionally deferred and documented

---

## 6. Consumer Impact

### Known consumers
- [x] Frontend user experience inside extension
- [ ] Another backend service
- [ ] Internal tool / automation
- [ ] Analytics / telemetry pipeline
- [ ] Batch job / queue worker
- [ ] Admin workflow
- [ ] External / partner integration
- [ ] Other

### Consumer notes
- This task consumes backend search API behavior
- UI semantics depend on backend response semantics for empty vs error vs partial failure
- The extension should not expose raw backend ambiguity directly to users

### Consumer risk if semantics are wrong
- Users may think search is broken when it is only empty
- Users may see misleading loading or retry behavior
- Result rendering may break if field nullability or status semantics drift

---

## 7. Contract Impact

### Contract classification
- [ ] No shared contract impact
- [ ] Uses existing contract as-is
- [ ] Clarifies existing contract
- [x] Additive contract change
- [ ] Modifying contract change
- [ ] Breaking contract change
- [ ] New contract

### Contract source of truth
- schema / interface / doc: backend sample packet plus executable contract package when implemented
- version / reference: draft v1
- owner / steward: shared steward / frontend + backend

### Contract details

#### Request shape
- `query: string`
- optional `limit: number`
- query is trimmed before submit on client side
- empty query should not be submitted from the UI

#### Response shape
- `items: Array<SearchResultItem>`
- `totalApprox?: number`
- `requestId?: string`
- no pagination UI is required in this task even if backend contract supports pagination later

#### Required / optional / nullable fields
- `items` is required and must be an array
- `displayName` is required for each result item
- `fileType` may be optional only if UI fallback is defined
- `updatedAt` may be nullable only if UI fallback is defined

#### Status / state semantics
- frontend assumes one-shot request/response behavior for v1
- empty results are represented by a successful response with `items: []`
- recoverable failures should map to retryable UI
- terminal failures should map to non-retry guidance only if backend semantics clearly distinguish them

#### Error semantics
- validation errors should not normally surface because frontend blocks empty query
- unauthorized responses should use extension auth handling pattern if already defined
- generic server errors should show retryable error state unless explicitly non-retryable

#### Retry / idempotency expectations
- repeated identical search requests are safe
- retry does not create side effects

#### Ordering / filtering / pagination semantics if applicable
- frontend assumes backend returns ordered results
- frontend does not implement extra client sorting
- pagination is out of scope for v1 UI

### Open contract questions
- Whether `updatedAt` is guaranteed for all item types
- Whether backend will distinguish retryable vs terminal search failure in structured form
- Whether `totalApprox` exists in v1 or later only

---

## 8. Dependencies

### Upstream dependencies
- Backend search API contract agreement
- Auth context already available in extension
- Result item open behavior decision if click should do more than placeholder action

### Downstream dependencies
- QA validation of loading, empty, and error states
- Handoff to backend if frontend discovers contract ambiguity during implementation

### External dependencies
- None for sample packet

### Blocking decisions
- Final result item field list
- Final error taxonomy if retry behavior depends on it

---

## 9. Repository Scope

### Expected owned paths
- `apps/edge-extension/**`

### Expected shared paths
- `packages/shared-types/**`
- `packages/api-contract/**`

### Cross-boundary edits expected?
- [x] Yes, minimal and justified

If yes, explain:
- frontend may need generated contract client/type updates
- shared contract artifacts may be touched only through approved contract flow
- frontend should not modify backend semantics directly

---

## 10. Acceptance Criteria

- [ ] Extension shows a Drive Search input in the intended UI location
- [ ] Submitting a non-empty query triggers the backend search request
- [ ] UI shows a loading state during in-flight request
- [ ] UI shows an empty state when the backend returns zero results
- [ ] UI shows a result list when the backend returns matches
- [ ] UI shows a retryable error state for recoverable request failure
- [ ] Result items render required fields without layout breakage
- [ ] Frontend does not silently invent backend semantics beyond documented assumptions

---

## 11. Non-Functional Requirements

- performance expectations: no obviously avoidable duplicate requests on a single submit
- latency expectations: UI must visibly enter loading state immediately after submit
- security requirements: do not expose internal error payloads directly in raw form
- observability requirements: search submit and search result click should be instrumented if analytics hook already exists
- backward compatibility requirements: must not break existing extension navigation or auth flow
- rollout / feature flag requirements: use feature flag if the extension already gates incomplete features this way

---

## 12. Verification Plan

### Required verification
- [x] Unit tests
- [x] Integration tests
- [ ] Contract tests
- [ ] Migration tests
- [x] Manual UI validation
- [x] Error-path validation
- [x] Auth / permission validation
- [ ] Retry / idempotency validation
- [ ] Logging / metrics / trace inspection
- [x] Staging / preview verification
- [x] End-to-end verification with consumer
- [ ] Other

### Required scenarios
- happy path: query returns multiple files
- invalid input: empty query does not submit
- unauthorized / forbidden: extension handles auth failure without broken UI
- dependency failure: generic backend failure shows retryable error state
- duplicate request / retry: repeated manual retry remains stable
- empty / missing data: valid success with zero results shows empty state

### Verification evidence expected
- screenshots or screen recording of loading / empty / success / error states
- test output for frontend unit/integration coverage
- brief note on any unverified contract assumptions

---

## 13. Handoff Expectations

### Expected next owner
- [ ] Frontend
- [ ] Backend
- [x] QA
- [x] Reviewer
- [ ] Release owner
- [ ] Data / analytics owner
- [ ] Security / privacy reviewer
- [ ] Other

### Handoff must include
- [x] files changed
- [x] contract semantics
- [ ] migration notes
- [x] risks
- [x] verification performed
- [x] verification not performed
- [x] exact next step for receiver

### Expected handoff trigger
- frontend implementation complete against agreed contract assumptions
- backend semantics stable enough for integration validation

---

## 14. Risks

- **Risk**: backend returns partially missing fields not handled by UI
  - **Impact area**: result rendering
  - **Likelihood**: medium
  - **Mitigation / fallback**: define UI fallback or tighten contract requiredness
  - **Owner**: frontend + backend

- **Risk**: retryable vs terminal error semantics remain ambiguous
  - **Impact area**: error UX
  - **Likelihood**: medium
  - **Mitigation / fallback**: treat as generic retryable error until taxonomy is finalized
  - **Owner**: backend

- **Risk**: feature lands without sufficient empty/error visual validation
  - **Impact area**: user trust
  - **Likelihood**: low to medium
  - **Mitigation / fallback**: require explicit QA pass on non-happy paths
  - **Owner**: QA

---

## 15. Open Questions

- **Question**: Should clicking a result immediately open a file or only select it?
  - why it matters: affects completion scope and analytics semantics
  - current assumption: placeholder click behavior is acceptable for v1 sample
  - owner to resolve: product / frontend

- **Question**: Is `updatedAt` required for every search result item?
  - why it matters: affects fallback rendering
  - current assumption: field may be absent and UI fallback may be needed
  - owner to resolve: backend

---

## 16. Definition of Done for This Task

This task is done when all of the following are true:

- [ ] Scoped frontend implementation is complete
- [ ] Acceptance criteria are met
- [ ] Contract assumptions are documented
- [ ] Required loading / empty / success / error states exist
- [ ] Verification has been completed to the required level
- [ ] Risks and open questions are documented
- [ ] Handoff or completion note is prepared
- [ ] No hidden blocker remains

Add any task-specific done conditions below:
- [ ] Search input and result list follow existing extension interaction patterns
- [ ] Result rendering remains stable for missing optional metadata