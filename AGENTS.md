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
- Verify UI changes in the running browser at relevant desktop/mobile sizes; a build is not visual verification.
- Report changed files, tests, visual limitations and environment issues.
- Never commit or push without explicit permission.

