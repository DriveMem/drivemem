# Frontend Task Packets

This directory stores frontend task packets and examples.

Use this directory for:
- task packets that define upcoming frontend work
- active frontend work packets
- example packets that demonstrate the expected level of detail

## How to use

1. Start from `docs/agent/frontend/task-packet-template.md`
2. Create one task packet per meaningful frontend task
3. Keep the packet focused on one deliverable or one tightly related change set
4. Link related backend packets when the task depends on backend behavior
5. Update the packet when important assumptions, risks, or verification expectations change

## What a good frontend task packet should do

A good packet should let a frontend agent begin work without inventing hidden assumptions.

At minimum, it should make clear:
- what user problem is being solved
- what frontend surfaces are in scope
- what is explicitly out of scope
- what backend contract is being consumed or assumed
- what user-visible states must exist
- how the work will be verified
- what counts as done

## Naming convention

Preferred:
- `task-<short-name>.md`
- `task-<ticket-id>-<short-name>.md`
- `YYYY-MM-DD-<short-name>.md`

Examples:
- `task-sample-drive-search-entry.md`
- `task-123-recent-files-panel.md`

Choose short, stable, searchable names.

## Relationship to other docs

Use this directory together with:
- `docs/agent/frontend/frontend-agent.md`
- `docs/agent/frontend/task-packet-template.md`
- `docs/agent/frontend/handoff-template.md`
- `docs/agent/frontend/definition-of-done.md`

If the task crosses frontend and backend boundaries, also read:
- `docs/agent/shared/operating-model.md`
- `docs/agent/shared/repo-boundaries.md`
- `docs/agent/shared/contract-first-policy.md`
