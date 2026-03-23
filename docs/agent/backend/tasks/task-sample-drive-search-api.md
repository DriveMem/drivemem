# Backend Task Packet — Sample: Drive Search API for Edge Extension

## Task Metadata

- **Task title**: Add Drive Search API for Edge extension file lookup
- **Task / ticket ID**: task-sample-drive-search-api
- **Owner / requester**: Product / Extension integration
- **Primary backend owner**: Backend
- **Related agents / teams**: Frontend, QA
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
  - `docs/agent/backend/task-packet-template.md`
  - `docs/agent/shared/contract-first-policy.md`
  - `docs/agent/frontend/tasks/task-sample-drive-search-entry.md`

---

## 1. Problem Statement

The Edge extension needs a backend capability to search user-accessible files in AI Drive.

Today there is no dedicated API contract for extension-driven file search that:
- accepts a user query
- returns a stable list of matching file items
- distinguishes empty results from request failure
- remains safe for repeated search requests
- is usable by frontend without reverse-engineering backend semantics

Backend work is required to provide a contract-aware, consumer-safe search endpoint for the extension.

---

## 2. Goal

Deliver a first backend search API that the Edge extension can use to search drive files.

After this task:
- the backend exposes a search endpoint for drive files
- the endpoint validates input
- the endpoint returns a stable result list shape
- the endpoint distinguishes empty success from actual failure
- the endpoint is safe for repeated identical requests
- the frontend can rely on documented response semantics

This task does not attempt to solve advanced ranking, indexing strategy redesign, or preview generation.

---

## 3. Scope

### In scope
- Add a drive search endpoint for extension consumption
- Validate request input
- Query file metadata from the current drive data source
- Return a documented result item shape
- Return successful empty result when no file matches
- Return structured error behavior for invalid input and generic server failure
- Document request/response semantics in the contract source of truth
- Add basic observability for request success/failure if existing backend patterns exist

### Out of scope
- Full-text indexing redesign
- Search ranking optimization
- File content preview or snippet generation
- Folder filter support
- Pagination for v1 unless the contract requires a future-safe optional field
- Cross-user shared-drive permission redesign

### Non-goals
- Reworking the full drive domain model
- Creating a public external API
- Introducing destructive side effects
- Changing frontend UI behavior directly

---

## 4. Current State

Relevant current backend behavior:
- The API server has no dedicated extension-facing drive search endpoint yet
- Drive metadata exists in backend-owned persistence or service integrations
- Existing auth context is assumed to identify the requesting user
- Existing backend logging / request instrumentation patterns should be reused where practical

Known limitations:
- No shared contract package entry exists yet for this exact endpoint
- File metadata completeness may vary by source
- Ranking quality is not a v1 requirement

---

## 5. Desired End State

After completion:
- `api-server` exposes a backend endpoint for drive file search
- The endpoint accepts a validated query string
- The endpoint returns a consistent JSON response shape with:
  - `items`
  - stable item fields
  - optional request metadata only if useful and documented
- Zero matches return success with `items: []`
- Invalid input returns structured validation failure
- Auth failure uses existing service auth handling
- Generic backend failure returns a structured server error response
- The endpoint is safe to call repeatedly without side effects

---

## 6. Consumer Impact

### Known consumers
- [x] Frontend
- [ ] Another backend service
- [ ] Internal tool / automation
- [ ] Analytics / telemetry pipeline
- [ ] Batch job / queue worker
- [ ] Admin workflow
- [ ] External / partner integration
- [ ] Other

### Consumer notes
- Primary consumer is the Edge extension frontend
- Frontend needs stable distinction between empty result and error
- Frontend needs enough item metadata to render a useful result list

### Consumer risk if semantics are wrong
- Frontend may show broken empty/error UX
- Result rendering may fail on missing fields
- Auth failures may surface incorrectly to users
- Future consumers may encode the wrong assumptions if the first contract is ambiguous

---

## 7. Contract Impact

### Contract classification
- [ ] No shared contract impact
- [ ] Uses existing contract as-is
- [ ] Clarifies existing contract
- [x] Additive contract change
- [ ] Modifying contract change
- [ ] Breaking contract change
- [x] New contract

### Contract source of truth
- schema / interface / doc: `packages/api-contract/**` plus `docs/contracts/**` if human-readable notes are needed
- version / reference: draft v1
- owner / steward: shared steward / frontend + backend

### Contract details

#### Request shape
- `query: string`
- optional `limit?: number`
- query must be non-empty after trim
- backend may enforce a max query length

#### Response shape
- `items: SearchResultItem[]`
- optional `requestId?: string`
- optional `totalApprox?: number` only if semantics are explicit

#### Required / optional / nullable fields
For each `SearchResultItem`:
- `id: string` required
- `displayName: string` required
- `fileType: string` preferred required for v1
- `updatedAt: string | null` allowed only if frontend fallback is documented

#### Status / state semantics
- v1 is synchronous request/response
- success with zero matches is not an error
- no partial-success semantics in v1 unless explicitly added and documented

#### Error semantics
- invalid query returns validation error
- unauthenticated or unauthorized request follows existing auth policy
- internal dependency failure returns server error
- backend should not collapse all outcomes into ambiguous generic success

#### Retry / idempotency expectations
- search is read-only
- repeated identical requests are safe
- no side effects are created by retry

#### Ordering / filtering / pagination semantics if applicable
- backend should define returned ordering explicitly
- frontend does not add its own sorting in v1
- pagination is out of scope unless contract includes a future-safe additive field

### Open contract questions
- Is `fileType` guaranteed from all metadata sources?
- Should `limit` be exposed in v1 or fixed server-side?
- Should `totalApprox` exist now or wait until pagination/filtering is introduced?

---

## 8. Data / Persistence Impact

### Data impact classification
- [x] No data impact
- [ ] Read-path only
- [ ] Write-path behavior change
- [ ] Schema change
- [ ] Migration required
- [ ] Backfill required
- [ ] Data interpretation change
- [ ] Index / performance-sensitive persistence change

### Details
- affected tables / collections / entities: existing file metadata read path only
- migration needed: none
- backward compatibility expectations: no persistence change expected
- rollback or forward-fix strategy: endpoint can be disabled or reverted without data migration
- impact on existing records: none
- concurrency / stale-write concerns: not applicable for read-only v1 endpoint

### Open data questions
- Whether current metadata source can guarantee required fields for all returned items

---

## 9. Auth / Permission / Safety Impact

- [ ] No auth / safety impact
- [x] Authentication behavior affected
- [x] Authorization behavior affected
- [ ] Entitlement / billing gating affected
- [ ] Destructive action involved
- [ ] Admin-only behavior involved
- [ ] Privacy-sensitive data involved
- [ ] Export / delete / mutation flow involved
- [ ] Security-sensitive payload involved

### Details
- current behavior: extension requests are expected to carry authenticated user context
- intended behavior: endpoint returns only files visible to the requesting user under current drive access rules
- failure mode if implemented incorrectly: user may see files they should not access, or valid users may receive ambiguous failures
- reviewer / approver needed: backend reviewer with auth awareness

---

## 10. Operational / Reliability Considerations

- [ ] No special runtime risk
- [x] Dependency failure risk
- [ ] Timeout / retry risk
- [ ] Duplicate request risk
- [ ] Eventual consistency
- [ ] Queue / async processing
- [ ] Partial failure handling
- [ ] Rate limiting / throttling
- [x] Performance-sensitive path
- [ ] High-cardinality logging or telemetry concern
- [x] Observability requirement
- [ ] Rollout sequencing concern

### Details
- Search may hit metadata source or index path with variable latency
- Query validation should reject obviously invalid input early
- Request logging should avoid leaking raw sensitive query content if policy says not to store it

### Fallback / degradation expectations
- If search dependency fails, return structured server error
- Do not degrade a dependency failure into empty success

---

## 11. Repository Scope

### Expected owned paths
- `apps/api-server/**`

### Expected shared paths
- `packages/api-contract/**`
- `packages/shared-types/**`
- `docs/contracts/**`

### Cross-boundary edits expected?
- [x] Yes, minimal and justified

If yes, explain:
- contract package updates are expected
- shared contract docs may need update
- backend should not directly modify frontend-owned app behavior

---

## 12. Acceptance Criteria

- [ ] API server exposes a drive search endpoint for extension use
- [ ] Empty query or invalid query returns structured validation failure
- [ ] Valid query with no matches returns success with `items: []`
- [ ] Valid query with matches returns a stable list of result items
- [ ] Returned item fields are documented and stable enough for frontend rendering
- [ ] Auth and permission checks prevent cross-user file leakage
- [ ] Search requests are read-only and safe to retry
- [ ] Contract source of truth is updated or created for the endpoint

---

## 13. Non-Functional Requirements

- performance expectations: avoid obviously unnecessary full-scan behavior if an indexed path already exists
- latency expectations: reasonable interactive response for extension use
- security requirements: do not leak unauthorized file metadata
- observability requirements: request success/failure should be inspectable through existing backend patterns
- backward compatibility requirements: no existing consumer should break because this is additive
- rollout / feature flag requirements: optional if the service already gates new endpoints or callers

---

## 14. Dependencies

### Upstream dependencies
- Existing auth context propagation
- Existing file metadata source availability

### Downstream dependencies
- Frontend integration against final response shape
- QA validation of empty/error/auth cases

### External dependencies
- None for sample packet beyond current service infrastructure

### Blocking decisions
- Final required field set for `SearchResultItem`
- Whether frontend needs explicit retryability classification in errors

---

## 15. Implementation Notes

### Notes
- Prefer additive contract design
- Keep endpoint read-only and side-effect free
- Prefer explicit empty-success semantics over ambiguous generic result codes
- Reuse existing auth and error-handling patterns where they are already correct
- Do not expose internal storage-specific field names directly if consumer-safe names are clearer

---

## 16. Verification Plan

### Required verification
- [x] Unit tests
- [x] Integration tests
- [x] Contract tests
- [ ] Migration tests
- [x] Manual endpoint validation
- [x] Error-path validation
- [x] Auth / permission validation
- [x] Retry / idempotency validation
- [x] Logging / metrics / trace inspection
- [x] Staging / preview verification
- [x] End-to-end verification with consumer
- [ ] Other

### Required scenarios
- happy path: valid query returns matching items
- invalid input: empty or invalid query fails validation
- unauthorized / forbidden: auth failure follows existing policy
- dependency failure: search dependency failure returns structured server error
- duplicate request / retry: repeated identical request returns stable read-only behavior
- empty / missing data: valid query with no match returns success with empty items

### Verification evidence expected
- endpoint test output
- contract example payloads
- auth/permission validation notes
- brief observability note for success/failure visibility

---

## 17. Handoff Expectations

### Expected next owner
- [x] Frontend
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
- endpoint implemented and contract semantics stable enough for frontend integration

---

## 18. Risks

- **Risk**: metadata source lacks some fields frontend expects
  - **Impact area**: contract completeness
  - **Likelihood**: medium
  - **Mitigation / fallback**: tighten required field guarantees or document nullable fallback clearly
  - **Owner**: backend

- **Risk**: auth scoping is implemented incorrectly
  - **Impact area**: security / user trust
  - **Likelihood**: low to medium
  - **Mitigation / fallback**: explicit auth/permission validation and reviewer scrutiny
  - **Owner**: backend reviewer

- **Risk**: dependency failure is misreported as empty success
  - **Impact area**: UX correctness
  - **Likelihood**: medium
  - **Mitigation / fallback**: keep error taxonomy explicit in handler/service
  - **Owner**: backend

---

## 19. Open Questions

- **Question**: Should `limit` be consumer-configurable in v1?
  - why it matters: changes request contract shape and frontend control surface
  - current assumption: optional, may remain server-side default only
  - owner to resolve: frontend + backend

- **Question**: Must `updatedAt` be present for every item?
  - why it matters: frontend result rendering fallback
  - current assumption: nullable is acceptable only if explicitly documented
  - owner to resolve: backend

---

## 20. Definition of Done for This Task

This task is done when all of the following are true:

- [ ] Scoped backend implementation is complete
- [ ] Acceptance criteria are met
- [ ] Contract expectations are implemented and documented
- [ ] Auth / permission behavior is validated
- [ ] Verification has been completed to the required level
- [ ] Risks and open questions are documented
- [ ] Required handoff or completion note is prepared
- [ ] No hidden blocker remains

Add any task-specific done conditions below:
- [ ] Empty result and failure result are clearly distinguishable to consumers
- [ ] Endpoint remains read-only and side-effect free under retry