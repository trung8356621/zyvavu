---
name: zyvavu-execution-guard
description: Mandatory for Zyvavu coding, editing, testing and debugging. Stops retry loops, scope drift, verification creep, invented architecture and unapproved persistent-data actions.
---

# Zyvavu Execution Guard — adapted from SEO-OPS

This is a **behavior guard**, not an app feature. Apply together with `zyvavu-token-discipline` and `compact-coding`.

## Execution state machine

- **PROCEED:** command succeeded, or a directly related failure has an understood scoped fix.
- **CHANGE_STRATEGY:** first failure of an attempt family; read the actual error and try a materially different, evidence-based approach once.
- **STOP_AND_ASK:** the second attempt for the same purpose fails, a guard below trips, or an unapproved architectural decision is required. Do not try one more thing.

### The same attempt family includes

Different PowerShell quoting for the same command; different selectors/scripts to open one Media Picker; repeated browser logs; `grep`, recursive scans or Git history for the same question; modified test command rerun without new hypothesis. Renaming the script does not reset the count.

## Mandatory stop conditions

1. **Retry limit:** two failed attempts to accomplish the same purpose; then STOP_AND_ASK.
2. **Tool loop:** `read → command → error → edit → command → error` repeated twice without a materially new explanation; STOP.
3. **Timebox:** no more than ~5 minutes of active investigation of a single blocker without meaningful progress. Stop that investigation, report evidence. No artificial countdowns or background waiting to extend the limit.
4. **Scope drift:** unrelated module, test framework, code cleanup, UI redesign or DB change required? Do not edit; ask if it affects the task.
5. **Architecture invention:** do not add a competing source of truth, new DB table/column, API route, library, parallel service or independent UI atom without task authorization. Propose the smallest path and stop for approval.
6. **Verification creep:** no Playwright, Puppeteer, browser automation, screenshot/debug scripts, autonomous login, selector investigation or environment restarts. Owner manually verifies UI.
7. **Broad discovery:** start with named files, current module and known docs; after two focused searches, stop instead of scanning all of `D:\` or Git history without a specific reason.
8. **Repeated rewrites:** do not rewrite the same implementation a third time because the approach is uncertain.
9. **Unrelated tests:** report failures outside requested scope; do not fix another subsystem to achieve a green suite.
10. **Material ambiguity:** if the choice changes public URLs, data shape, user workflow, access boundaries, redirects or published behavior, ask rather than guessing.
11. **Dev DB:** no mutations, migration application, seed/reset/restore or write-capable tests against current development DB without explicit approval. Isolated test DB for write tests.

## Command / background discipline

- Do `git status -sb` at start and end; `git log -1 --oneline` only when HEAD information is needed. Do not conduct recurring Git investigations.
- Prefer direct relevant source inspection over broad searches and tests focused to touched behavior over an entire suite.
- Check long-running tasks at most twice without progress; terminate/stop and report if stalled. Do not start duplicate build/test tasks.
- Run a reasonable final verification pass once after implementation. If scoped code changes require rerun, run the relevant check only.
- Leave dev server processes and local proxy configuration alone unless explicitly instructed.
- Never hide crashes with catch-all code, infinite restarts or fake successful API responses.

## Stop message

```
BLOCKED / NEED USER DECISION
Goal: ...
Evidence: ...
Attempt 1: ...
Attempt 2 (different approach): ...
Guard triggered: ...
Smallest safe next option: ...
No further implementation or tool loops were performed.
```

## Avoid over-triggering

Do not stop for straightforward syntax fixes, simple CSS or expected focused test changes. Use judgment: the purpose is to prevent loops, not prevent normal coding.

Origin: `trung8356621/seo-ops-addons/.agents/skills/seo-ops-execution-guard/SKILL.md`, adapted; SEO-OPS/Laravel paths removed.
