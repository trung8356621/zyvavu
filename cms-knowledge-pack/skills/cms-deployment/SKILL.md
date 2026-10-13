---
name: cms-deployment
description: Use to plan self-hosted CMS deployment, permissions, backup restore, storage migration boundaries, pg_trgm and operations.
---
# Deployment
Source: https://docs.google.com/document/d/1D0ar9L1rAkORzF4B7q-eHCvq1o1kU9EuUu680LAasJY/edit
CONFIRMED:
- Operator purchases and manages hosting; customer gets site-admin functionality and cannot access /admin/system or escalate roles.
- One protected system area with backend guard, not a per-feature permissions matrix.
- Local media Core, stable media URL through proxy. Storage migration + provider credentials belong to independent operator-only service (paid operational feature), not customer admin.
- Media binary files outside PostgreSQL; application-level portable backup (like SEO-OPS concept), avoiding SQL dump as the main export; preserve relationships and URLs.
- Search internal uses pg_trgm; no embedding model/vector search.
- Content lifecycle draft→publish→trash→permanent delete.
PROPOSED:
- VPS Vietnam origin-first for B2B, Singapore comparison, choose based on benchmarks; static deploy when suitable for profile.
OPEN:
- Per-site process isolation vs tenant sharing, backup file format/restore exact design, provider and paid optimization specifics.
TEST:
- access APIs as site-admin, restore on new environment, object migration with disk almost full, media URL unchanged, deploy rollback.
