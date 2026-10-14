# Agent instructions

- Read `README.md` and relevant `cms-knowledge-pack` decisions/skills before modifying source.
- For any Zyvavu Admin UI, custom view, component, CSS, or navigation task, agents MUST read `cms-knowledge-pack/skills/cms-admin-design/SKILL.md` first.
- Follow the 10 mandatory Admin UI rules (no competing design system):
  1. Prefer existing Payload components for native CMS behavior.
  2. Prefer official Mantine components for custom Admin UI.
  3. Never reinvent basic Button, Input, Select, Badge, Tabs, Modal, etc.
  4. Never introduce arbitrary per-screen component sizes.
  5. Use Mantine's supported size scale and centralized defaultProps.
  6. Centralize Admin colors and chosen size/radius/density defaults through `theme.json`.
  7. Keep Admin styles isolated from Public.
  8. Never refactor approved navigation or working Payload behavior without a clear requirement.
  9. Any exception requires explanation before implementation.
  10. A successful build is NOT sufficient UI acceptance.
- Inspect `git status` first and preserve unrelated or uncommitted work.
- Reuse `D:\zyvavu` and running services; avoid redundant installs, rebuilds and restarts.
- Do not change database schema unless the task explicitly includes it.
- Preserve URL Registry, publish lifecycle, authentication and permission contracts.
- Never promote an `OPEN` decision to `CONFIRMED` independently.
- UI Verification Policy:
  - Do NOT run Playwright, browser automation, screenshot capture scripts, automated login scripts, or repeated browser selector debugging.
  - The project owner will manually inspect the running Admin and provide screenshots and browser errors when necessary.
  - Responsibilities:
    - Implement UI using the approved Payload/Mantine conventions.
    - Run build, typecheck, lint and appropriate non-destructive unit tests.
    - Analyze user-provided screenshots and fix identified issues.
    - Mark uninspected UI as NOT VERIFIED.
    - Never claim visual PASS without owner confirmation.
- Report changed files, tests, visual limitations and environment issues.
- Never commit or push without explicit permission.

## Mandatory execution discipline (ported from SEO-OPS)

For every coding, debugging, testing or editing task, read and apply:
- `.agents/skills/zyvavu-execution-guard/SKILL.md`
- `.agents/skills/zyvavu-token-discipline/SKILL.md`
- `.agents/skills/compact-coding/SKILL.md`

The three Skills complement (do not replace) the existing CMS Knowledge Pack and `cms-admin-design` Skill. `docs-bulk-update` is optional and user-triggered only.

### Hard budgets and stop rules
- Same objective: at most two materially different failed attempts; then STOP_AND_ASK. Renaming commands/scripts does not reset attempts.
- One blocker: approximately five minutes without meaningful progress; STOP that investigation, summarize evidence and ask for direction.
- `git status -sb` at task start and task end; avoid repeated history/diff exploration unless needed for this task.
- One final focused verification pass after changes. Do not rerun unchanged failing tests or start overlapping background tasks.
- No Playwright, Puppeteer, automated login, screenshot/selector debugging or browser scripts. User supplies UI screenshots; visual status is NOT VERIFIED until owner confirmation.
- No automatic database writes, migrations, seeds or test records on the current development database.
- Do not perform unrelated changes or invent a second UI/URL/feature architecture.
- Stop after task completion and report concisely; do not continue auditing or create new follow-up work unprompted.

### Environment and artifact hygiene
- Canonical project: `D:\zyvavu`; reuse existing dev server on port 3107 and proxy `https://zyvavu.test`. Never start competing servers or change credentials to make verification pass.
- Temp probes/logs/screenshots must stay out of Git. No new permanent `scripts/dump_*`, `scripts/reproduce_*`, login scripts or `test-*.png` unless expressly requested.
- Owner verifies final UI manually. Before staging for Git, review temporary artifacts and tracked/untracked files; never silently delete existing data.

### UI states and overlays
- Maintain visible dialog/drawer surface, readable actions, adequate contrast, empty/loading/error states and immediate feedback for async actions.
- Use native Payload + Mantine. Do not reimplement Payload overlays/forms, and do not layer uncontrolled global CSS overrides.

