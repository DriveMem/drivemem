# Task Packet Template

> Use this template for every scoped implementation task assigned to an agent.
> A task packet is required before execution.
> The assigned agent must follow:
> - `docs/agent/AGENTS.md`
> - its role-specific agent file
> - this task packet
>
> If this task packet conflicts with approved ADRs or official contracts,
> ADRs and contracts take precedence unless explicitly approved otherwise.

---

## 1. Task Metadata

### Task ID
`<e.g. FE-001>`

### Title
`<short, implementation-focused title>`

### Assigned Agent
`<Frontend Agent | Backend Agent | Other>`

### Status
`<Draft | Ready | In Progress | Blocked | Done | Partial>`

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

Describe the concrete outcome the agent must achieve.

**Format guidance**
- Write the target state, not a vague wish
- Make it implementation-scoped
- Keep it testable

**Template**
> Implement `<feature/change>` so that `<user/system outcome>` is possible in `<surface/module>`.

---

## 3. Why This Task Exists

Explain the product or engineering reason for doing this task now.

Include:
- why it matters
- what workflow or risk it unblocks
- how it connects to the current milestone

---

## 4. In Scope

List exactly what is included.

Use short bullets such as:
- Add `<component/page/state>`
- Integrate with `<endpoint/contract>`
- Handle `<loading/error/empty states>`
- Add `<tests/telemetry>` if required

Be precise. 
If something is not listed here, the agent should assume it is out of scope.

---

## 5. Out of Scope

List what must not be included in this task, even if it seems related.

Examples:
- No visual redesign
- No backend contract changes
- No drag-and-drop upload
- No pagination
- No telemetry
- No auth refresh redesign

This section is mandatory.

---

## 6. User / System Outcome

Describe what should be true after the task is completed.

### User-visible outcome
`<what the user can do or see>`

### System outcome
`<what the codebase or integration now supports>`

---

## 7. Surfaces / Modules Affected

List the product surfaces or code modules affected.

Examples:
- New Tab page
- popup
- options page
- file list section
- upload box
- search bar
- API client adapter
- shared UI primitives

---

## 8. Source of Truth

List the exact documents and files the agent must follow.

### Product
- `docs/product/prd.md`
- `<additional product doc if any>`

### Architecture
- `docs/architecture/system-overview.md`
- `docs/architecture/frontend-architecture.md`
- `<relevant ADRs>`

### Contracts
- `docs/contracts/openapi.yaml`
- `docs/contracts/error-model.md`
- `<other contract docs if needed>`

### Existing implementation references
- `<relevant file paths>`
- `<relevant file paths>`

### Previous handoff
- `<link/path to latest related handoff, if any>`

If any required source is missing, note it explicitly in section 16 (Dependencies / Blockers).

---

## 9. Allowed Paths

The agent may only modify these paths unless explicitly approved otherwise.

```txt
<fill in allowed paths here>

Example:

apps/edge-extension/**
packages/api-contract/generated/**
packages/shared-types/** # only if explicitly needed
```

---

## 10. Blocked Paths

The agent must not modify these paths for this task.

```txt
<fill in blocked paths here>

Example:

apps/api-server/**
infra/**
docs/contracts/openapi.yaml
```

---

## 11. Contracts and Data Assumptions

Document the exact API or type assumptions the agent is allowed to rely on.

### Endpoints / contracts involved
- `<method> <path>`
- `<method> <path>`

### Request shape assumptions
`<brief notes or linked schema>`

### Response shape assumptions
`<brief notes or linked schema>`

### Error handling assumptions
`<documented errors only>`

### Forbidden assumptions
- Do not invent undocumented fields
- Do not assume undocumented status codes
- Do not assume hidden backend fallback behavior

If the contract is incomplete, state exactly what is missing.

---

## 12. UX / Behavior Requirements

Describe the behavior the agent must implement.

### Required states
- initial
- loading
- empty
- error
- success feedback
- disabled state if relevant

### Interaction requirements
- `<e.g. clicking Upload opens file picker>`
- `<e.g. failed request shows retry affordance>`
- `<e.g. empty result shows helpful message>`

### Accessibility requirements
- Use real buttons for clickable actions
- Inputs must be labeled or clearly associated
- Primary flow must be keyboard accessible
- Avoid color-only status communication

### Copy requirements
- `<use existing product copy>` or
- `<follow concise default copy style>`

---

## 13. Non-Functional Requirements

Document any important engineering constraints.

Examples:
- Must not introduce new dependencies
- Must preserve existing layout structure
- Must keep first render lightweight
- Must not block UI on telemetry success
- Must not log sensitive file content
- Must follow current styling conventions

Only include relevant constraints.

---

## 14. Validation Plan

List the commands and checks the agent must run before completing the task.

### Required commands
```bash
<command 1>
<command 2>
<command 3>
```

Typical frontend example:
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

The agent must report validation truthfully as:
- pass
- fail
- not run
- blocked

---

## 15. Deliverables

List the outputs expected from the agent.

Examples:
- implementation code
- tests
- updated UI states
- small documentation note
- handoff note

---

## 16. Dependencies / Blockers

List any required dependencies, prerequisites, or known blockers.

Examples:
- Backend endpoint must already exist
- Generated API client must be up to date
- Shared type needs confirmation
- Product copy not finalized
- Telemetry schema missing

If there are no blockers, explicitly write:

> None at task start.

---

## 17. Risks / Watchouts

List the main ways this task could go wrong.

Examples:
- Contract mismatch with backend
- Hidden auth state issue
- Layout regression on small screens
- Duplicate network requests from effect dependencies
- Missing empty/error state handling

The agent should pay extra attention to these during implementation and handoff.

---

## 18. Handoff Requirements

At the end of the task, the agent must provide a handoff containing all of the following:

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
- Do not mark the task done if only the happy path works
- Clearly distinguish complete vs partial completion

---

## 19. Definition of Done for This Task

A task is complete only if all relevant items below are true.

### Functional
- [ ] Requested behavior is implemented
- [ ] In-scope states are handled
- [ ] Out-of-scope items were not added

### Technical
- [ ] Changes stay within allowed paths
- [ ] No undocumented contract assumptions were introduced
- [ ] Required validation commands were run or honestly reported

### Quality
- [ ] No obvious regression introduced
- [ ] Code is readable and maintainable
- [ ] Tests were added or updated if behavior changed

### Handoff
- [ ] Handoff note is complete
- [ ] Remaining blockers or dependencies are explicit

If any required item is unchecked, status should be `Partial` or `Blocked`, not `Done`.

---

## 20. Execution Notes for the Agent

Use this section for any task-specific instructions.

Examples:
- Reuse existing file card component if possible
- Do not change global navigation structure
- Keep API wiring inside existing client layer
- Prefer local state over adding a new global store
- Use mock data only if live contract is unavailable and task explicitly allows it

---

## 21. Final Task Packet — Ready-to-Execute Summary

Provide a short plain-language summary that the assigned agent can act on immediately.

**Template**

> Implement `<feature>` in `<surface>` using `<approved contract/doc references>`, stay within `<allowed paths>`, do not do `<major exclusions>`, and complete validation plus handoff before marking the task done.
