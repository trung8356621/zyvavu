---
name: cms-performance
description: Use for rendering strategy, PageSpeed, SSR navigation, CSR islands, cache delays, image delivery and VN networking benchmarks.
---
# Performance
Source: https://docs.google.com/document/d/1D0ar9L1rAkORzF4B7q-eHCvq1o1kU9EuUu680LAasJY/edit
CONFIRMED:
- B2B homepage mobile Lighthouse green prioritized, but SEO parity never traded away for score 100.
- SSR real navigation/core SEO links. Home newest articles/products can CSR for freshness; they need not individually be indexed from homepage.
- Single Page/Post/Product invalidates immediately on change; aggregate cache home/listing/category/menu refreshes per D site setting.
- Critical URL resolution, redirects, HTTP status and noindex cannot be delayed to D.
- Origin-first performance in VN; do not require Cloudflare Proxy, benchmark multiple ISPs.
PROPOSED:
- Static shell + CSR islands; bounded on-demand image variants with caching, stable proxied media paths.
CHECK:
- LCP/CLS/INP, actual mobile devices, stale URLs, initial Mega interaction, CDN bypass/route performance, memory, network requests.
OPEN:
- Precise delay calculation policy and cache batch/per-item semantics.
