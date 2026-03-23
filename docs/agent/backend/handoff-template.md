# Handoff Template

> Every task must end with a handoff note using this structure.
> Do not skip sections. If a section has nothing to report, write "None".

---

## Handoff

### Task ID
`<e.g. FE-001>`

### Status
`<Done | Partial | Blocked>`

### Completed
- `<what was implemented>`
- `<what was implemented>`

### Files Changed
- `<path/to/file>`
- `<path/to/file>`

### Validation Status
| Check       | Result                        |
|-------------|-------------------------------|
| lint        | pass / fail / not run / blocked |
| typecheck   | pass / fail / not run / blocked |
| tests       | pass / fail / not run / blocked |
| build       | pass / fail / not run / blocked |
| manual      | pass / fail / not run / blocked |

### Known Issues
- `<issue or risk>`
- `<issue or risk>`

Or: None.

### Dependencies
- `<what another agent or human needs to provide>`
- `<what another agent or human needs to provide>`

Or: None.

### Next Best Action
- `<what the next agent or human should do>`
- `<what the next agent or human should do>`

---

## Rules

- Report validation honestly. Do not claim pass if the command was not run.
- Do not hide blockers.
- Do not mark Done if only the happy path works.
- Distinguish clearly between Done and Partial.
- If the task requires follow-up from another agent, state the exact dependency.
