# Definition of Done

> A task is only considered **Done** when all applicable items below are satisfied.
> If any required item is not met, the task status must be **Partial** or **Blocked**.

---

## Functional

- [ ] Requested behavior is implemented as specified in the task packet
- [ ] All in-scope UI states are handled (loading, empty, error, success, disabled)
- [ ] Out-of-scope items were not added
- [ ] Primary user path works end-to-end within the task boundary

## Technical

- [ ] Changes stay within allowed paths
- [ ] No undocumented contract assumptions were introduced
- [ ] Types are correct and complete
- [ ] No unrelated files were modified
- [ ] Code is readable, maintainable, and follows existing conventions

## Quality

- [ ] No obvious regressions introduced
- [ ] Accessibility basics are preserved (real buttons, labeled inputs, keyboard nav)
- [ ] Tests were added or updated if behavior changed
- [ ] No unnecessary dependency additions

## Validation

- [ ] All required validation commands were run
- [ ] Results are reported truthfully (pass / fail / not run / blocked)
- [ ] Manual verification steps were completed if specified

## Collaboration

- [ ] Contract discipline was respected (no invented fields, no guessed behavior)
- [ ] Changes do not silently alter user-visible behavior outside scope
- [ ] Handoff note is complete using the approved template

## Handoff

- [ ] Summary of what was done
- [ ] Files changed listed
- [ ] Validation results reported
- [ ] Known issues and risks documented
- [ ] Dependencies on other agents or humans are explicit
- [ ] Next best action is clear

---

## Status Rules

| Condition | Status |
|-----------|--------|
| All items checked | **Done** |
| Core behavior works but gaps remain | **Partial** |
| Cannot proceed without external input | **Blocked** |
| Task not started | **Draft** or **Ready** |

---

## Agent Responsibility

The completing agent is responsible for honestly self-assessing against this checklist.
Do not mark Done to "move on". Partial is an acceptable and respected status.
