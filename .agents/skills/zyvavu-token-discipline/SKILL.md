---
name: zyvavu-token-discipline
description: Mandatory for Zyvavu coding tasks. Limits repeated context loading, unnecessary discovery and redundant verification while retaining correctness.
---

# Zyvavu Token Discipline — adapted from SEO-OPS

- Read task-named files, applicable `cms-knowledge-pack` Skill(s), and exact implicated source first.
- Read only relevant symbols/ranges of large files when practical.
- Avoid entire repo scans, old sibling repos and remote history absent a concrete gap.
- Form a hypothesis based on evidence; do not keep researching after the implementation path is clear.
- Reopen a file only if it changed or there is a specific unanswered question.
- Prefer one focused search rather than several broad searches.
- Do not generate a scratch script if a direct code inspection or existing test answers the question.
- Prefer targeted build/static/unit verification; do not repeat equivalent checks.
- No unnecessary agents, model calls, tools or background tasks; no parallel overlapping tasks for the same purpose.
- If ambiguity affects architecture or behavior, follow `zyvavu-execution-guard` STOP_AND_ASK.
- Correctness, security and data preservation outrank token savings.

Origin: `trung8356621/seo-ops-addons/.agents/skills/seo-ops-token-discipline/SKILL.md`.
