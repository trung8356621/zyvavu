---
name: cms-url-routing
description: Use to implement or audit public URL registry, flat permalinks, slug changes, redirects and multilingual URL mapping.
---
# Flat URL engine
Read SEO Backend URL appendix.
## Confirmed behavior
Independent resource ID vs public permalink. In Postgres use indexed exact-match public route registry mapping host/site and normalized path to resource type/ID; support short flat URLs across collections. Resolve via registry, not repeated collection queries. Detect clashes at publish with uniqueness constraints; store redirect history on slug changes; central getPublicUrl used by sitemap/canonical/breadcrumb/menu. Migration preserves existing WordPress public URLs and status.
## Proposed implementation detail
Unique (site_id, host?, normalized_path) plus locale metadata; reconcile physical URL uniqueness even if two locales share a path. Atomic transactions/outbox strategy for changes. No broad fuzzy canonical guesses.
## Tests
Concurrent slug clashes, trailing slash, case, percent encoding, static route priority, rename, unpublish, remove prefix, redirect loop, locale collisions, database and cache consistency. Benchmark index 10k/100k.
Source https://docs.google.com/document/d/1DqWEe4v3frWWr_uuf9MZ1EngCuyMd3jlMwhEzTu7uEU/edit
