# ZYVAVU CMS — SEO OUTPUT PARITY AUDIT REPORT

- **Audit Timestamp**: 2026-10-16T08:55:44.864Z
- **Target Base URL**: `https://zyvavu.test`
- **Audit Mode**: `SELF`
- **WordPress Parity Status**: **NOT YET VERIFIED**

## 1. EXECUTIVE SUMMARY

| Metric | Value |
| :--- | :--- |
| Total Pages Audited | **10** |
| Total URLs Crawled | **8** |
| PASS Findings | **13** |
| FAIL Findings (Action Required) | **7** |
| WARNING Findings (Review Advised) | **7** |
| HIGH Severity Findings | **7** |
| MEDIUM Severity Findings | **3** |
| LOW Severity Findings | **4** |

## 2. AUDIT FINDINGS REGISTER

| Severity | Status | Category | Finding ID | Title | Affected URLs |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `INFO` | `PASS` | `http` | `CANONICAL_VALID` | Canonical URL is valid and self-referential | `https://zyvavu.test/` |
| `LOW` | `WARNING` | `semantic` | `SEMANTIC_DESC_SHORT` | Meta description is short (< 30 chars) | `https://zyvavu.test/` |
| `HIGH` | `FAIL` | `semantic` | `SEMANTIC_H1_MISSING` | Missing primary <h1> heading | `https://zyvavu.test/` |
| `INFO` | `PASS` | `structured-data` | `SCHEMA_GRAPH_VALID` | Schema @graph entities and relationships valid | `https://zyvavu.test/` |
| `HIGH` | `FAIL` | `http` | `CANONICAL_MISSING` | Missing canonical URL link tag | `https://zyvavu.test/feed` |
| `MEDIUM` | `WARNING` | `semantic` | `SEMANTIC_DESC_MISSING` | Missing meta description | `https://zyvavu.test/feed` |
| `HIGH` | `FAIL` | `semantic` | `SEMANTIC_H1_MISSING` | Missing primary <h1> heading | `https://zyvavu.test/feed` |
| `LOW` | `WARNING` | `semantic` | `SEMANTIC_MAIN_MISSING` | Missing semantic <main> landmark | `https://zyvavu.test/feed` |
| `INFO` | `PASS` | `http` | `CANONICAL_VALID` | Canonical URL is valid and self-referential | `https://zyvavu.test/gioi-thieu` |
| `INFO` | `PASS` | `structured-data` | `SCHEMA_GRAPH_VALID` | Schema @graph entities and relationships valid | `https://zyvavu.test/gioi-thieu` |
| `INFO` | `PASS` | `http` | `CANONICAL_VALID` | Canonical URL is valid and self-referential | `https://zyvavu.test/posts/keep-post-9c752682` |
| `LOW` | `WARNING` | `semantic` | `SEMANTIC_DESC_SHORT` | Meta description is short (< 30 chars) | `https://zyvavu.test/posts/keep-post-9c752682` |
| `INFO` | `PASS` | `structured-data` | `SCHEMA_GRAPH_VALID` | Schema @graph entities and relationships valid | `https://zyvavu.test/posts/keep-post-9c752682` |
| `INFO` | `PASS` | `http` | `CANONICAL_VALID` | Canonical URL is valid and self-referential | `https://zyvavu.test/posts/renamed-slug-9c752682` |
| `LOW` | `WARNING` | `semantic` | `SEMANTIC_DESC_SHORT` | Meta description is short (< 30 chars) | `https://zyvavu.test/posts/renamed-slug-9c752682` |
| `INFO` | `PASS` | `structured-data` | `SCHEMA_GRAPH_VALID` | Schema @graph entities and relationships valid | `https://zyvavu.test/posts/renamed-slug-9c752682` |
| `INFO` | `PASS` | `http` | `CANONICAL_VALID` | Canonical URL is valid and self-referential | `https://zyvavu.test/posts/bai-khong-prefetch` |
| `INFO` | `PASS` | `structured-data` | `SCHEMA_GRAPH_VALID` | Schema @graph entities and relationships valid | `https://zyvavu.test/posts/bai-khong-prefetch` |
| `HIGH` | `FAIL` | `http` | `HTTP_NOT_FOUND` | HTTP 404 Not Found for published route | `https://zyvavu.test/category/cong-nghe` |
| `HIGH` | `FAIL` | `http` | `HTTP_NOT_FOUND` | HTTP 404 Not Found for published route | `https://zyvavu.test/tag/typescript` |
| `HIGH` | `FAIL` | `http` | `HTTP_NOT_FOUND` | HTTP 404 Not Found for published route | `https://zyvavu.test/old-gioi-thieu` |
| `INFO` | `PASS` | `http` | `HTTP_404_VERIFIED` | Nonexistent URL returns clean 404 status | `https://zyvavu.test/non-existent-page-404-audit-test` |
| `INFO` | `PASS` | `discovery` | `DISCOVERY_RSS_LINK_FOUND` | RSS feed auto-discovery link present in head | `https://zyvavu.test` |
| `INFO` | `PASS` | `discovery` | `DISCOVERY_RSS_FEED_VALID` | Valid RSS feed active at /feed | `https://zyvavu.test/feed` |
| `MEDIUM` | `WARNING` | `discovery` | `DISCOVERY_ROBOTS_TXT_MISSING` | robots.txt is missing (404) | `https://zyvavu.test/robots.txt` |
| `MEDIUM` | `WARNING` | `discovery` | `DISCOVERY_SITEMAP_MISSING` | XML Sitemap missing (not yet implemented) | `https://zyvavu.test/sitemap.xml` |
| `HIGH` | `FAIL` | `link-graph` | `LINK_BROKEN_INTERNAL` | Broken internal link(s) discovered in SSR HTML | `https://zyvavu.test/about` |

### Detailed Findings & Evidence

#### [LOW] Meta description is short (< 30 chars) (`SEMANTIC_DESC_SHORT`)
- **Status**: `WARNING`
- **Category**: `semantic`
- **Description**: Meta description is only 23 characters long.
- **Evidence**: `"Tagline from site-admin"`
- **Affected URLs**:
  - `https://zyvavu.test/`

#### [HIGH] Missing primary <h1> heading (`SEMANTIC_H1_MISSING`)
- **Status**: `FAIL`
- **Category**: `semantic`
- **Description**: The page has no <h1> heading rendered in SSR HTML.
- **Recommendation**: Render the page or article title within a single semantic <h1>.
- **Affected URLs**:
  - `https://zyvavu.test/`

#### [HIGH] Missing canonical URL link tag (`CANONICAL_MISSING`)
- **Status**: `FAIL`
- **Category**: `http`
- **Description**: Published page does not declare a <link rel="canonical"> element.
- **Recommendation**: Emit <link rel="canonical"> in server metadata.
- **Affected URLs**:
  - `https://zyvavu.test/feed`

#### [MEDIUM] Missing meta description (`SEMANTIC_DESC_MISSING`)
- **Status**: `WARNING`
- **Category**: `semantic`
- **Description**: No <meta name="description"> found in SSR HTML.
- **Recommendation**: Provide descriptive meta description from excerpt or content snippet.
- **Affected URLs**:
  - `https://zyvavu.test/feed`

#### [HIGH] Missing primary <h1> heading (`SEMANTIC_H1_MISSING`)
- **Status**: `FAIL`
- **Category**: `semantic`
- **Description**: The page has no <h1> heading rendered in SSR HTML.
- **Recommendation**: Render the page or article title within a single semantic <h1>.
- **Affected URLs**:
  - `https://zyvavu.test/feed`

#### [LOW] Missing semantic <main> landmark (`SEMANTIC_MAIN_MISSING`)
- **Status**: `WARNING`
- **Category**: `semantic`
- **Description**: Page structure does not contain a semantic <main> element.
- **Recommendation**: Wrap the primary content area in <main>.
- **Affected URLs**:
  - `https://zyvavu.test/feed`

#### [LOW] Meta description is short (< 30 chars) (`SEMANTIC_DESC_SHORT`)
- **Status**: `WARNING`
- **Category**: `semantic`
- **Description**: Meta description is only 15 characters long.
- **Evidence**: `"Updated excerpt"`
- **Affected URLs**:
  - `https://zyvavu.test/posts/keep-post-9c752682`

#### [LOW] Meta description is short (< 30 chars) (`SEMANTIC_DESC_SHORT`)
- **Status**: `WARNING`
- **Category**: `semantic`
- **Description**: Meta description is only 23 characters long.
- **Evidence**: `"Tagline from site-admin"`
- **Affected URLs**:
  - `https://zyvavu.test/posts/renamed-slug-9c752682`

#### [HIGH] HTTP 404 Not Found for published route (`HTTP_NOT_FOUND`)
- **Status**: `FAIL`
- **Category**: `http`
- **Description**: Published or expected URL returned HTTP 404.
- **Evidence**: `HTTP 404 at https://zyvavu.test/category/cong-nghe`
- **Recommendation**: Verify URL Registry entry or route mapping for this resource.
- **Affected URLs**:
  - `https://zyvavu.test/category/cong-nghe`

#### [HIGH] HTTP 404 Not Found for published route (`HTTP_NOT_FOUND`)
- **Status**: `FAIL`
- **Category**: `http`
- **Description**: Published or expected URL returned HTTP 404.
- **Evidence**: `HTTP 404 at https://zyvavu.test/tag/typescript`
- **Recommendation**: Verify URL Registry entry or route mapping for this resource.
- **Affected URLs**:
  - `https://zyvavu.test/tag/typescript`

#### [HIGH] HTTP 404 Not Found for published route (`HTTP_NOT_FOUND`)
- **Status**: `FAIL`
- **Category**: `http`
- **Description**: Published or expected URL returned HTTP 404.
- **Evidence**: `HTTP 404 at https://zyvavu.test/old-gioi-thieu`
- **Recommendation**: Verify URL Registry entry or route mapping for this resource.
- **Affected URLs**:
  - `https://zyvavu.test/old-gioi-thieu`

#### [MEDIUM] robots.txt is missing (404) (`DISCOVERY_ROBOTS_TXT_MISSING`)
- **Status**: `WARNING`
- **Category**: `discovery`
- **Description**: Request to https://zyvavu.test/robots.txt returned HTTP 404. Crawlers expect a standard robots.txt.
- **Recommendation**: Add a static or dynamic robots.txt route in Next.js (e.g. app/robots.ts).
- **Affected URLs**:
  - `https://zyvavu.test/robots.txt`

#### [MEDIUM] XML Sitemap missing (not yet implemented) (`DISCOVERY_SITEMAP_MISSING`)
- **Status**: `WARNING`
- **Category**: `discovery`
- **Description**: Request to https://zyvavu.test/sitemap.xml returned HTTP 404. Zyvavu does not currently expose /sitemap.xml.
- **Recommendation**: Implement dynamic sitemap.xml generation for published posts, pages, categories, and tags.
- **Affected URLs**:
  - `https://zyvavu.test/sitemap.xml`

#### [HIGH] Broken internal link(s) discovered in SSR HTML (`LINK_BROKEN_INTERNAL`)
- **Status**: `FAIL`
- **Category**: `link-graph`
- **Description**: Discovered 1 internal link(s) returning 4xx or 5xx status.
- **Evidence**: `https://zyvavu.test/ -> https://zyvavu.test/about (HTTP 404)`
- **Recommendation**: Update or remove broken <a href> links from templates or menus.
- **Affected URLs**:
  - `https://zyvavu.test/about`

## 3. SEO HTTP & CANONICAL AUDIT

| URL | Status | Canonical Tag | Indexable? | Soft 404? | Redirects |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `https://zyvavu.test/` | `200` | `https://zyvavu.test` | ✅ Yes | No | Direct |
| `https://zyvavu.test/feed` | `200` | _None_ | ✅ Yes | No | Direct |
| `https://zyvavu.test/gioi-thieu` | `200` | `https://zyvavu.test/gioi-thieu` | ✅ Yes | No | Direct |
| `https://zyvavu.test/posts/keep-post-9c752682` | `200` | `https://zyvavu.test/posts/keep-post-9c752682` | ✅ Yes | No | Direct |
| `https://zyvavu.test/posts/renamed-slug-9c752682` | `200` | `https://zyvavu.test/posts/renamed-slug-9c752682` | ✅ Yes | No | Direct |
| `https://zyvavu.test/posts/bai-khong-prefetch` | `200` | `https://zyvavu.test/posts/bai-khong-prefetch` | ✅ Yes | No | Direct |
| `https://zyvavu.test/category/cong-nghe` | `404` | _None_ | ❌ No | No | Direct |
| `https://zyvavu.test/tag/typescript` | `404` | _None_ | ❌ No | No | Direct |
| `https://zyvavu.test/old-gioi-thieu` | `404` | _None_ | ❌ No | No | Direct |
| `https://zyvavu.test/non-existent-page-404-audit-test` | `404` | _None_ | ❌ No | No | Direct |

## 4. SEMANTIC HTML & SSR CONTENT AUDIT

| URL | Title (Length) | Description | H1 Count | Images (No Alt) | Word Count | Landmarks |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `https://zyvavu.test/` | "Zyvavu 0873aaba — Tagline..." (41) | Present (23) | 0 H1s | All Alt OK | 1289 | main, article, nav, header, footer |
| `https://zyvavu.test/feed` | "Zyvavu 0873aaba..." (15) | _Missing_ | 0 H1s | All Alt OK | 69 | _None_ |
| `https://zyvavu.test/gioi-thieu` | "Giới thiệu — Zyvavu 0873a..." (28) | Present (41) | 1 H1 | All Alt OK | 869 | main, nav, header, footer |
| `https://zyvavu.test/posts/keep-post-9c752682` | "Keep Post 9c752682 — Zyva..." (36) | Present (15) | 1 H1 | All Alt OK | 847 | main, nav, header, footer |
| `https://zyvavu.test/posts/renamed-slug-9c752682` | "Original Slug Post 9c7526..." (45) | Present (23) | 1 H1 | All Alt OK | 874 | main, nav, header, footer |
| `https://zyvavu.test/posts/bai-khong-prefetch` | "Bài không prefetch — Zyva..." (36) | Present (45) | 1 H1 | All Alt OK | 901 | main, nav, header, footer |

## 5. STRUCTURED DATA & ENTITY GRAPH AUDIT

| URL | JSON-LD Scripts | Entities Found | WebSite | Org | WebPage | Article | Breadcrumbs | Relationship Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `https://zyvavu.test/` | 1 (1 valid) | 4 | ✅ | ✅ | ❌ | - | - | ✅ Valid |
| `https://zyvavu.test/feed` | 0 (0 valid) | 0 | ❌ | ❌ | ❌ | - | - | ✅ Valid |
| `https://zyvavu.test/gioi-thieu` | 1 (1 valid) | 5 | ✅ | ✅ | ✅ | - | ✅ | ✅ Valid |
| `https://zyvavu.test/posts/keep-post-9c752682` | 1 (1 valid) | 6 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Valid |
| `https://zyvavu.test/posts/renamed-slug-9c752682` | 1 (1 valid) | 6 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Valid |
| `https://zyvavu.test/posts/bai-khong-prefetch` | 1 (1 valid) | 6 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Valid |

## 6. INTERNAL LINK GRAPH & CRAWL TOPOLOGY

- **Crawled Pages Depth Distribution**:
  - `https://zyvavu.test/`: Depth 0 (Inbound: 5, Outbound: 6)
  - `https://zyvavu.test/posts/bai-khong-prefetch`: Depth 1 (Inbound: 5, Outbound: 3)
  - `https://zyvavu.test/about`: Depth 1 (Inbound: 5, Outbound: 0)
  - `https://zyvavu.test/posts/renamed-slug-9c752682`: Depth 1 (Inbound: 1, Outbound: 3)
  - `https://zyvavu.test/posts/keep-post-9c752682`: Depth 1 (Inbound: 1, Outbound: 3)
  - `https://zyvavu.test/posts/legacy-post-9c752682`: Depth 1 (Inbound: 1, Outbound: 3)

- **Broken Internal Links Found**: 1
  - ❌ `https://zyvavu.test/` -> `https://zyvavu.test/about` (HTTP 404: Not Found)

- **Redirecting Internal Links Found**: 0

- **Orphan URLs in Inventory**: 0

## 7. DISCOVERY CAPABILITIES (FEED, ROBOTS, SITEMAP)

| Capability | Endpoint / Feature | Status | Details |
| :--- | :--- | :--- | :--- |
| RSS Discovery Link | HTML `<head>` | ✅ PASS | https://zyvavu.test/feed/ |
| RSS XML Endpoint | `/feed` | ✅ PASS | HTTP 200, 4 items |
| Crawl Policy | `/robots.txt` | ⚠️ WARNING | HTTP 404 (Missing/Invalid) |
| XML Sitemap | `/sitemap.xml` | ⚠️ WARNING | Sitemap endpoint not implemented (HTTP 404) |

## 8. WORDPRESS PARITY EVALUATION

> [!NOTE]
> Cross-platform WordPress parity is **NOT YET VERIFIED** because no explicit WordPress target URL pairs were provided.
> Self-audit was completed across local Zyvavu SSR outputs. To run comparison mode, provide `--pairs=<file.json>`.

## 9. RANKED RECOMMENDATIONS FOR NEXT SEO TASK

1. **[HIGH] Fix Broken Internal Links in Themes/Menus**:
   Ensure template links such as `/about` are either backed by a published page or updated to existing published routes.
2. **[MEDIUM] Provide Static or Dynamic `/robots.txt` Route**:
   Expose Next.js `app/robots.ts` returning valid `User-agent: *` and `Sitemap: <siteUrl>/sitemap.xml` directives.
3. **[MEDIUM] Implement Dynamic XML Sitemap Engine**:
   Create `/sitemap.xml` (or sitemap index) dynamically indexing all published posts, pages, categories, and tags from URL Registry.
4. **[MEDIUM] Consolidate Canonical Origin**:
   Ensure `siteUrl` in site-settings strictly aligns with public host (`https://zyvavu.test` vs localhost port) so canonical and JSON-LD URLs remain consistent across reverse-proxy environments.
5. **[LOW] Add Heading Hierarchy Validation to Editor**:
   Prevent content editors from skipping heading levels (e.g. H1 directly to H3).
