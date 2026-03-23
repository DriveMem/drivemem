# Backend Task Packets

This directory stores backend task packets and examples.

Use this directory for:
- task packets that define upcoming backend work
- active backend work packets
- example packets that demonstrate the expected level of detail

## How to use

1. Start from `docs/agent/backend/task-packet-template.md`
2. Create one task packet per meaningful backend task
3. Keep the packet focused on one backend deliverable or one tightly related change set
4. Link related frontend packets when the backend change enables or changes frontend behavior
5. Update the packet when contract, data, risk, or verification expectations change materially

## What a good backend task packet should do

A good packet should let a backend agent begin work without inventing hidden semantics.

At minimum, it should make clear:
- what backend behavior needs to change
- who consumes that behavior
- what contract is being introduced or changed
- whether data, auth, migration, or operational risk is involved
- how the work will be verified
- what counts as done

## Naming convention

Preferred:
- `task-<short-name>.md`
- `task-<ticket-id>-<short-name>.md`
- `YYYY-MM-DD-<short-name>.md`

Examples:
- `task-sample-drive-search-api.md`
- `task-204-upload-status-endpoint.md`

Choose short, stable, searchable names.

## Relationship to other docs

Use this directory together with:
- `docs/agent/backend/backend-agent.md`
- `docs/agent/backend/task-packet-template.md`
- `docs/agent/backend/handoff-template.md`
- `docs/agent/backend/definition-of-done.md`

If the task crosses frontend and backend boundaries, also read:
- `docs/agent/shared/operating-model.md`
- `docs/agent/shared/repo-boundaries.md`
- `docs/agent/shared/contract-first-policy.md`
