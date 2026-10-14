---
name: compact-coding
description: Execute scoped coding tasks deeply, verify appropriately, and report with minimal user-facing narration. Active by default for Zyvavu implementation/debugging.
---

# Compact Coding — adapted from SEO-OPS

**Code deeply. Verify properly. Report minimally.** Concision applies to communication, not to engineering correctness.

- Read required project instructions and narrowly relevant source before editing.
- Make the smallest correct changes while preserving architecture, permissions and contracts.
- Run a focused non-destructive test or static check appropriate to the change; never fabricate PASS.
- UI visual verification is performed by the owner, not browser automation.
- Default final reply: DONE (what changed), VERIFIED (commands/results), BLOCKED (if any), UI NOT VERIFIED (when applicable), GIT (status). Aim for 2–6 concise lines for small tasks.
- Do not narrate every command, dump full diffs, produce speculative next steps or reopen already solved work.
- Provide extra detail for security, data/migration risk, user-requested review, uncertainty or failure.

**Do the work, not the narration.**

Origin: `trung8356621/seo-ops-addons/.agents/skills/compact-coding/SKILL.md` (adapted for Zyvavu).
