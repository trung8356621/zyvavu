---
name: cms-seo-backend
description: Use for SEO metadata, structured data, sitemap, crawlability, canonical, redirect and WordPress SEO parity.
---
# SEO backend
Read SEO Backend original, URL appendix and decision registry. No UI or keyword-scoring.
## Confirmed
SEO backend belongs to CMS and is independent of SEO-OPS. Learn selectively from WordPress Core, Yoast and Rank Math. Central URL resolver; indexability and canonical consistent across sitemap, meta, HTML, JSON-LD, breadcrumb, internal links. Keep SEO parity first during WP migration. Track schema change signals from public upstream sources but verify Google current support; no auto-patches.
## Sitemap and IndexNow
Sitemap new URLs delayed by site setting D, IndexNow auto at 2D; manual helper. Single detail cache invalidates immediately, aggregates later; critical status/redirect/noindex cannot wait for batch.
## Avoid
Treating schema.org validity as guarantee of Google rich results; faking Product data; Google Indexing API for general article indexing; claims that Lighthouse 100 increases ranking; putting SEO-OPS in request path.
## Tests
WP vs Payload HTTP/status/meta/schema/canonical/links diff, search-engine crawlable pagination, graph @id integrity, lastmod/indexability, route collisions, index now scheduling. Source license review before reusing PHP code.
Source https://docs.google.com/document/d/1DqWEe4v3frWWr_uuf9MZ1EngCuyMd3jlMwhEzTu7uEU/edit
