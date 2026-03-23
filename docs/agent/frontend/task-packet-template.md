# Frontend Task Packet Template

> Use this template for every task assigned to the Frontend Agent.
>
> Required governing documents:
> - `docs/agent/AGENTS.md`
> - `docs/agent/shared/operating-model.md`
> - `docs/agent/shared/contract-first-policy.md`
> - `docs/agent/shared/repo-boundaries.md`
> - `docs/agent/frontend/frontend-agent.md`
>
> If this task packet conflicts with approved ADRs or official contracts,
> ADRs and contracts take precedence unless explicitly approved otherwise.

---

## 1. Task Metadata

### Task ID
`<e.g. FE-001>`

### Title
`<short implementation-focused title>`

### Assigned Agent
`Frontend Agent`

### Status
`<Draft | Ready | In Progress | Blocked | Partial | Done>`

### Priority
`<P0 | P1 | P2 | P3>`

### Owner / Requester
`<human owner or role>`

### Created Date
`<YYYY-MM-DD>`

### Last Updated
`<YYYY-MM-DD>`

---

## 2. Objective

Describe the exact frontend outcome the agent must deliver.

**Template**
> Implement `<feature/change>` in `<surface/module>` so that `<user-visible outcome>` is supported.

**Good examples**
- Implement the Recent Files section in the New Tab page so that signed-in users can see their latest uploaded files.
- Implement upload error handling in the New Tab upload box so that failed uploads surface a retry path and clear user feedback.

---

## 3. Why This Task Exists

Explain why this task matters now.

Include:
- the user or product need
- the workflow or milestone it supports
- the problem or risk it reduces
- why this should be done now rather than later

Keep this section brief but concrete.

---

## 4. In Scope

List only the items the Frontend Agent should implement in this task.

Examples:
- Add `<component or section>`
- Integrate with `<approved endpoint>`
- Implement loading / empty / error states
- Add minimal tests for `<behavior>`
- Reuse existing layout / primitives where possible

If an item is not listed here, the agent should assume it is **out of scope**.

---

## 5. Out of Scope

List explicitly what the agent must **not** do in this task, even if related.

Examples:
- No visual redesign
- No backend endpoint changes
- No OpenAPI changes
- No drag-and-drop upload
- No pagination
- No telemetry changes
- No auth flow redesign
- No refactor of unrelated components

This section is mandatory.

---

## 6. User Outcome

Describe what will be true for the user once this task is complete.

### Before
`<what the user cannot currently do / what is broken or missing>`

### After
`<what the user can now do / what now works>`

Focus on user-visible product impact.

---

## 7. Frontend Surface / Module

List the exact frontend surfaces affected.

Examples:
- New Tab page
- popup
- options page
- file list panel
- upload box
- search bar
- AI answer panel
- empty state component
- client-side API adapter

---

## 8. Source of Truth

List the exact documents and implementation files the Frontend Agent must follow.

### Shared agent governance
- `docs/agent/AGENTS.md`
- `docs/agent/shared/operating-model.md`
- `docs/agent/shared/contract-first-policy.md`
- `docs/agent/shared/repo-boundaries.md`

### Frontend agent rules
- `docs/agent/frontend/frontend-agent.md`

### Product
- `docs/product/prd.md`
- `<other relevant product docs if any>`

### Architecture
- `docs/architecture/system-overview.md`
- `docs/architecture/frontend-architecture.md`
- `<relevant ADRs if any>`

### Contracts
- `docs/contracts/openapi.yaml`
- `docs/contracts/error-model.md`
- `<other contract docs if relevant>`

### Existing implementation references
- `<relevant file path>`
- `<relevant file path>`

### Previous handoff
- `<path to related handoff, if any>`

If any required source is missing, note it in section 17 (Dependencies / Blockers).

---

## 9. Allowed Paths

The Frontend Agent may only modify these paths for this task unless explicitly approved otherwise.

```txt
<fill in allowed paths>

Example:

apps/edge-extension/**
packages/api-contract/generated/**
packages/shared-types/** # only if explicitly required
docs/agent/frontend/tasks/**
```

Keep this section narrow.
Only include paths the agent truly needs.

---

## 10. Blocked Paths

The Frontend Agent must not modify these paths in this task.

```txt
<fill in blocked paths>

Example:

apps/api-server/**
infra/**
docs/contracts/openapi.yaml
docs/contracts/error-model.md
docs/architecture/backend-architecture.md
docs/agent/backend/**
```

This section is mandatory.

---

## 11. Contract and Data Constraints

Document exactly what API and type assumptions are allowed.

### Endpoints involved
- `<METHOD> <PATH>`
- `<METHOD> <PATH>`

### Request shape assumptions
`<brief schema notes or reference to generated types>`

### Response shape assumptions
`<brief schema notes or reference to generated types>`

### Error model assumptions
`<documented error states only>`

### Explicit frontend rules
- Do not invent undocumented fields
- Do not invent undocumented status codes
- Do not guess fallback backend behavior
- Do not silently widen payload assumptions

If the contract is incomplete, state exactly what is missing.

---

## 12. UI / UX Requirements

Describe how the frontend should behave.

### Required states
- initial
- loading
- empty
- error
- success feedback
- disabled state if relevant

### Interaction requirements
- `<e.g. clicking Upload opens the file picker>`
- `<e.g. failed fetch shows retry UI>`
- `<e.g. empty file list shows helpful message>`
- `<e.g. loading state prevents duplicate submission>`

### Accessibility requirements
- Use real buttons for actions
- Inputs must be labeled or clearly associated
- Primary flow must be keyboard accessible
- Do not rely on color alone for important state communication

### Copy requirements
- `<use existing product copy if defined>`
- otherwise use concise default product language

### Visual constraints
- Preserve current layout unless explicitly requested otherwise
- Reuse existing component patterns where possible
- Do not introduce a new styling system

---

## 13. Non-Functional Constraints

Document important engineering constraints for this task.

Examples:
- Must not introduce new dependencies
- Must reuse existing API client layer
- Must preserve first-render performance on New Tab
- Must avoid duplicate requests from unstable effects
- Must not log sensitive file content
- Must follow current styling conventions
- Must not introduce a new global store unless explicitly approved

Only include constraints relevant to this task.

---

## 14. Testing Expectations

List the expected testing scope for this task.

### Required test coverage
- `<unit test for helper/state transition if relevant>`
- `<component test for user interaction if relevant>`
- `<smoke coverage for primary path if relevant>`

### Not required
- `<optional: note what test types are intentionally excluded>`

### Testing notes
- `<special setup or limitations, if any>`

This section should match the actual risk level of the task.

---

## 15. Validation Plan

List the commands and checks the Frontend Agent must run before completion.

### Required commands
```bash
<command 1>
<command 2>
<command 3>
```

Typical example:
```bash
pnpm lint
pnpm typecheck
pnpm test --filter edge-extension
pnpm build --filter edge-extension
```

### Manual verification steps
- `<step>`
- `<step>`
- `<step>`

### Success criteria
- `<criterion>`
- `<criterion>`
- `<criterion>`

The Frontend Agent must report validation truthfully as:
- pass
- fail
- not run
- blocked

---

## 16. Deliverables

List what the Frontend Agent is expected to produce.

Examples:
- implementation code
- updated UI states
- tests
- small documentation note if needed
- handoff note

If documentation updates are not required, say so.

---

## 17. Dependencies / Blockers

List prerequisites, dependencies, or known blockers.

Examples:
- Backend endpoint must already exist
- Generated API client must be up to date
- Product copy is still pending
- Shared type definition needs confirmation
- Auth behavior is not finalized
- Empty state copy not finalized

If there are no blockers, write:

> None at task start.

---

## 18. Risks / Watchouts

List the main ways this task could fail or regress.

Examples:
- API contract mismatch
- stale generated types
- duplicate network requests
- auth edge case not handled
- empty/error state omitted
- layout breakage in compact view
- introducing a hidden dependency on backend behavior

The Frontend Agent should pay extra attention to these during implementation and handoff.

---

## 19. Handoff Requirements

At task completion, the Frontend Agent must provide all of the following.

### Required sections
- Summary
- Files Changed
- Validation
- Known Issues / Risks
- Dependencies
- Next Best Action

### Required truthfulness rules
- Do not claim commands passed if they were not run
- Do not hide blockers
- Do not mark the task Done if only the happy path works
- Clearly distinguish complete vs partial completion

For the handoff structure, follow:
> `docs/agent/frontend/handoff-template.md`

---

## 20. Definition of Done for This Task

A task is complete only if all relevant items below are true.

### Functional
- [ ] Requested frontend behavior is implemented
- [ ] In-scope UI states are handled
- [ ] Out-of-scope items were not added

### Technical
- [ ] Changes stay within allowed paths
- [ ] No undocumented contract assumptions were introduced
- [ ] Required validation commands were run or honestly reported

### Quality
- [ ] No obvious regression introduced
- [ ] Code is readable and maintainable
- [ ] Tests were added or updated when behavior changed

### UX
- [ ] Loading / empty / error states are covered where relevant
- [ ] Accessibility basics are preserved
- [ ] Copy and interactions align with current product direction

### Handoff
- [ ] Handoff note is complete
- [ ] Remaining blockers or dependencies are explicit

If any required item is unchecked, status should be `Partial` or `Blocked`, not `Done`.

For detailed completion standards, also follow:
> `docs/agent/frontend/definition-of-done.md`

---

## 21. Task-Specific Execution Notes

Use this section for any additional task-specific instructions.

Examples:
- Reuse the existing file card component
- Do not change the New Tab top navigation
- Keep API wiring inside the existing client abstraction
- Prefer local state over creating a new shared store
- Use mock data only if live contract wiring is explicitly allowed
- Preserve current empty state illustration behavior

Keep this section specific and actionable.

---

## 22. Ready-to-Execute Summary

Write a short instruction the Frontend Agent can act on immediately.

**Template**
> Implement `<feature>` in `<surface>` using `<approved docs/contracts>`, stay within `<allowed paths>`, do not do `<major exclusions>`, run the required validation steps, and finish with a complete handoff.

---

## 23. Execution Record (To Be Filled After Work Starts)

### Actual Status
`<In Progress | Blocked | Partial | Done>`

### Actual Files Changed
- `<file>`
- `<file>`

### Validation Results
- `<command/check>`: pass | fail | not run | blocked

### Notes
- `<implementation note>`
- `<unexpected issue>`
- `<follow-up recommendation>`
