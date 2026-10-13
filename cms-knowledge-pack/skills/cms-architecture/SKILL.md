---
name: cms-architecture
description: Use when planning or reviewing the Next.js Payload PostgreSQL website platform, modules, content ownership, architecture or permissions.
---
# CMS architecture
Read 00 README, 01 Decisions and original CMS/Hosting document FIRST.
## Confirmed
Core Next.js + Payload + PostgreSQL; Traditional B2B and Modern/Profile themes, optional Product/Catalog module; bounded theme variants and presets. CMS independent of SEO-OPS, which is optional content-push adapter only. Customer site-admin can edit site/theme/menu/content/SEO; system admin only can access /admin/system and privileged APIs; customer cannot elevate role. Host operated by owner.
## Proposed, not guaranteed
shadcn/ui and Embla as candidates; different static/profile deployment modes; shared versioned package strategy. Test before declaring optimal.
## Do not
Build visual freeform page builder; make SEO-OPS required to serve pages; create complex permissions matrix; turn hosting/storage migration into customer CMS feature; silently select multi-tenancy.
## Before coding
Locate current decisions; verify Payload/Next versions; define module boundaries and mutation lifecycle; ask for missing product scope; consider security enforcement on API not only nav hiding; test independent operation without SEO-OPS.
## Sources
CMS/Hosting https://docs.google.com/document/d/1D0ar9L1rAkORzF4B7q-eHCvq1o1kU9EuUu680LAasJY/edit
Roadmap https://docs.google.com/document/d/1SOW7UdS1ojrU5LJozS3K-k4xvtNHFE4P1nFc7YF9fEM/edit
