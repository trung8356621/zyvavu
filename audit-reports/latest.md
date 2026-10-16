# ZYVAVU CMS — SEO OUTPUT PARITY AUDIT REPORT

- **Audit Timestamp**: 2026-10-16T10:01:39.440Z
- **Target Base URL**: `https://zyvavu.test`
- **Audit Mode**: `SELF`
- **WordPress Parity Status**: **NOT YET VERIFIED**

## 1. EXECUTIVE SUMMARY

| Metric | Value | Classification |
| :--- | :--- | :--- |
| Total Pages Audited | **11** | Sample routes |
| Total URLs Crawled | **1** | Bounded crawl |
| PASS Findings | **1** | Verified |
| CONFIRMED FAIL Findings | **11** | Genuine action required |
| Total FAIL Findings | **11** | All failures |
| WARNING Findings | **4** | Review advised |
| INCONCLUSIVE / TIMEOUT | **0** | Cold SSR/Dev compile |
| NOT TESTED | **0** | Insufficient coverage |
| HIGH Severity (Verified) | **11** | Critical |
| MEDIUM Severity | **3** | Secondary |
| LOW Severity | **1** | Minor |

## 2. AUDIT FINDINGS REGISTER

| Severity | Status | Category | Finding ID | Title | Affected URLs |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `HIGH` | `FAIL` | `http` | `HTTP_SERVER_ERROR` | HTTP 5xx Server Error (500) | `https://zyvavu.test/` |
| `HIGH` | `FAIL` | `http` | `HTTP_SERVER_ERROR` | HTTP 5xx Server Error (500) | `https://zyvavu.test/gioi-thieu` |
| `HIGH` | `FAIL` | `http` | `HTTP_SERVER_ERROR` | HTTP 5xx Server Error (500) | `https://zyvavu.test/to-0e5366b2` |
| `HIGH` | `FAIL` | `http` | `HTTP_SERVER_ERROR` | HTTP 5xx Server Error (500) | `https://zyvavu.test/posts/keep-post-9c752682` |
| `HIGH` | `FAIL` | `http` | `HTTP_SERVER_ERROR` | HTTP 5xx Server Error (500) | `https://zyvavu.test/posts/renamed-slug-9c752682` |
| `HIGH` | `FAIL` | `http` | `HTTP_SERVER_ERROR` | HTTP 5xx Server Error (500) | `https://zyvavu.test/posts/bai-khong-prefetch` |
| `HIGH` | `FAIL` | `http` | `HTTP_SERVER_ERROR` | HTTP 5xx Server Error (500) | `https://zyvavu.test/category/test` |
| `HIGH` | `FAIL` | `http` | `HTTP_SERVER_ERROR` | HTTP 5xx Server Error (500) | `https://zyvavu.test/tag/fish` |
| `HIGH` | `FAIL` | `http` | `HTTP_SERVER_ERROR` | HTTP 5xx Server Error (500) | `https://zyvavu.test/from-0e5366b2` |
| `HIGH` | `FAIL` | `http` | `HTTP_SERVER_ERROR` | HTTP 5xx Server Error (500) | `https://zyvavu.test/posts/orig-slug-9c752682` |
| `HIGH` | `FAIL` | `http` | `HTTP_404_LEAK` | Nonexistent URL did not return 404 | `https://zyvavu.test/non-existent-page-404-audit-test` |
| `LOW` | `WARNING` | `discovery` | `DISCOVERY_RSS_LINK_MISSING` | RSS feed auto-discovery link missing in head | `https://zyvavu.test` |
| `MEDIUM` | `WARNING` | `discovery` | `DISCOVERY_RSS_FEED_MISSING` | RSS feed not found at /feed | `https://zyvavu.test/feed` |
| `MEDIUM` | `WARNING` | `discovery` | `DISCOVERY_ROBOTS_TXT_MISSING` | robots.txt is missing (404) | `https://zyvavu.test/robots.txt` |
| `MEDIUM` | `WARNING` | `discovery` | `DISCOVERY_SITEMAP_MISSING` | XML Sitemap missing (not yet implemented) | `https://zyvavu.test/sitemap.xml` |
| `INFO` | `PASS` | `link-graph` | `LINK_GRAPH_HEALTHY` | No broken or redirecting internal links found | `https://zyvavu.test/` |

### Detailed Findings & Evidence

#### [HIGH] HTTP 5xx Server Error (500) (`HTTP_SERVER_ERROR`)
- **Status**: `FAIL`
- **Category**: `http`
- **Description**: Server failed to render or respond to request.
- **Evidence**: `HTTP 500 Internal Server Error`
- **Recommendation**: Check server logs for unhandled runtime exceptions or database connectivity.
- **Affected URLs**:
  - `https://zyvavu.test/`

#### [HIGH] HTTP 5xx Server Error (500) (`HTTP_SERVER_ERROR`)
- **Status**: `FAIL`
- **Category**: `http`
- **Description**: Server failed to render or respond to request.
- **Evidence**: `HTTP 500 Internal Server Error`
- **Recommendation**: Check server logs for unhandled runtime exceptions or database connectivity.
- **Affected URLs**:
  - `https://zyvavu.test/gioi-thieu`

#### [HIGH] HTTP 5xx Server Error (500) (`HTTP_SERVER_ERROR`)
- **Status**: `FAIL`
- **Category**: `http`
- **Description**: Server failed to render or respond to request.
- **Evidence**: `HTTP 500 Internal Server Error`
- **Recommendation**: Check server logs for unhandled runtime exceptions or database connectivity.
- **Affected URLs**:
  - `https://zyvavu.test/to-0e5366b2`

#### [HIGH] HTTP 5xx Server Error (500) (`HTTP_SERVER_ERROR`)
- **Status**: `FAIL`
- **Category**: `http`
- **Description**: Server failed to render or respond to request.
- **Evidence**: `HTTP 500 Internal Server Error`
- **Recommendation**: Check server logs for unhandled runtime exceptions or database connectivity.
- **Affected URLs**:
  - `https://zyvavu.test/posts/keep-post-9c752682`

#### [HIGH] HTTP 5xx Server Error (500) (`HTTP_SERVER_ERROR`)
- **Status**: `FAIL`
- **Category**: `http`
- **Description**: Server failed to render or respond to request.
- **Evidence**: `HTTP 500 Internal Server Error`
- **Recommendation**: Check server logs for unhandled runtime exceptions or database connectivity.
- **Affected URLs**:
  - `https://zyvavu.test/posts/renamed-slug-9c752682`

#### [HIGH] HTTP 5xx Server Error (500) (`HTTP_SERVER_ERROR`)
- **Status**: `FAIL`
- **Category**: `http`
- **Description**: Server failed to render or respond to request.
- **Evidence**: `HTTP 500 Internal Server Error`
- **Recommendation**: Check server logs for unhandled runtime exceptions or database connectivity.
- **Affected URLs**:
  - `https://zyvavu.test/posts/bai-khong-prefetch`

#### [HIGH] HTTP 5xx Server Error (500) (`HTTP_SERVER_ERROR`)
- **Status**: `FAIL`
- **Category**: `http`
- **Description**: Server failed to render or respond to request.
- **Evidence**: `HTTP 500 Internal Server Error`
- **Recommendation**: Check server logs for unhandled runtime exceptions or database connectivity.
- **Affected URLs**:
  - `https://zyvavu.test/category/test`

#### [HIGH] HTTP 5xx Server Error (500) (`HTTP_SERVER_ERROR`)
- **Status**: `FAIL`
- **Category**: `http`
- **Description**: Server failed to render or respond to request.
- **Evidence**: `HTTP 500 Internal Server Error`
- **Recommendation**: Check server logs for unhandled runtime exceptions or database connectivity.
- **Affected URLs**:
  - `https://zyvavu.test/tag/fish`

#### [HIGH] HTTP 5xx Server Error (500) (`HTTP_SERVER_ERROR`)
- **Status**: `FAIL`
- **Category**: `http`
- **Description**: Server failed to render or respond to request.
- **Evidence**: `HTTP 500 Internal Server Error`
- **Recommendation**: Check server logs for unhandled runtime exceptions or database connectivity.
- **Affected URLs**:
  - `https://zyvavu.test/from-0e5366b2`

#### [HIGH] HTTP 5xx Server Error (500) (`HTTP_SERVER_ERROR`)
- **Status**: `FAIL`
- **Category**: `http`
- **Description**: Server failed to render or respond to request.
- **Evidence**: `HTTP 500 Internal Server Error`
- **Recommendation**: Check server logs for unhandled runtime exceptions or database connectivity.
- **Affected URLs**:
  - `https://zyvavu.test/posts/orig-slug-9c752682`

#### [HIGH] Nonexistent URL did not return 404 (`HTTP_404_LEAK`)
- **Status**: `FAIL`
- **Category**: `http`
- **Description**: Expected 404 for nonexistent route, but received HTTP 500.
- **Evidence**: `HTTP 500`
- **Recommendation**: Ensure missing content triggers notFound() and returns HTTP 404 status.
- **Affected URLs**:
  - `https://zyvavu.test/non-existent-page-404-audit-test`

#### [LOW] RSS feed auto-discovery link missing in head (`DISCOVERY_RSS_LINK_MISSING`)
- **Status**: `WARNING`
- **Category**: `discovery`
- **Description**: Homepage does not expose a <link rel="alternate" type="application/rss+xml"> tag.
- **Recommendation**: Add RSS auto-discovery link tag in root layout metadata.
- **Affected URLs**:
  - `https://zyvavu.test`

#### [MEDIUM] RSS feed not found at /feed (`DISCOVERY_RSS_FEED_MISSING`)
- **Status**: `WARNING`
- **Category**: `discovery`
- **Description**: Request to https://zyvavu.test/feed returned HTTP 500.
- **Recommendation**: Implement an RSS 2.0 feed route at /feed.
- **Affected URLs**:
  - `https://zyvavu.test/feed`

#### [MEDIUM] robots.txt is missing (404) (`DISCOVERY_ROBOTS_TXT_MISSING`)
- **Status**: `WARNING`
- **Category**: `discovery`
- **Description**: Request to https://zyvavu.test/robots.txt returned HTTP 500. Crawlers expect a standard robots.txt.
- **Recommendation**: Add a static or dynamic robots.txt route in Next.js (e.g. app/robots.ts).
- **Affected URLs**:
  - `https://zyvavu.test/robots.txt`

#### [MEDIUM] XML Sitemap missing (not yet implemented) (`DISCOVERY_SITEMAP_MISSING`)
- **Status**: `WARNING`
- **Category**: `discovery`
- **Description**: Request to https://zyvavu.test/sitemap.xml returned HTTP 500. Zyvavu does not currently expose /sitemap.xml.
- **Recommendation**: Implement dynamic sitemap.xml generation for published posts, pages, categories, and tags.
- **Affected URLs**:
  - `https://zyvavu.test/sitemap.xml`

## 3. SEO HTTP & CANONICAL AUDIT

| URL | Status | Canonical Tag | Indexable? | Soft 404? | Redirects |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `https://zyvavu.test/` | `500` | _None_ | ❌ No | No | Direct |
| `https://zyvavu.test/gioi-thieu` | `500` | _None_ | ❌ No | No | Direct |
| `https://zyvavu.test/to-0e5366b2` | `500` | _None_ | ❌ No | No | Direct |
| `https://zyvavu.test/posts/keep-post-9c752682` | `500` | _None_ | ❌ No | No | Direct |
| `https://zyvavu.test/posts/renamed-slug-9c752682` | `500` | _None_ | ❌ No | No | Direct |
| `https://zyvavu.test/posts/bai-khong-prefetch` | `500` | _None_ | ❌ No | No | Direct |
| `https://zyvavu.test/category/test` | `500` | _None_ | ❌ No | No | Direct |
| `https://zyvavu.test/tag/fish` | `500` | _None_ | ❌ No | No | Direct |
| `https://zyvavu.test/from-0e5366b2` | `500` | _None_ | ❌ No | No | Direct |
| `https://zyvavu.test/posts/orig-slug-9c752682` | `500` | _None_ | ❌ No | No | Direct |
| `https://zyvavu.test/non-existent-page-404-audit-test` | `500` | _None_ | ❌ No | No | Direct |

## 4. SEMANTIC HTML & SSR CONTENT AUDIT

| URL | Title (Length) | Description | H1 Count | Images (No Alt) | Word Count | Landmarks |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |

## 5. STRUCTURED DATA & ENTITY GRAPH AUDIT

| URL | JSON-LD Scripts | Entities Found | WebSite | Org | WebPage | Article | Breadcrumbs | Relationship Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |

## 6. INTERNAL LINK GRAPH & CRAWL TOPOLOGY

- **Crawled Pages Depth Distribution**:
  - `https://zyvavu.test/`: Depth 0 (Inbound: 0, Outbound: 0)

- **Broken Internal Links Found (Confirmed Failures)**: 0

- **Redirecting Internal Links Found**: 0

- **Orphan URLs in Inventory Status**: **NOT_VERIFIED**
  - ℹ️ _Sample crawl coverage insufficient to confirm orphan pages._

## 7. DISCOVERY CAPABILITIES (FEED, ROBOTS, SITEMAP)

| Capability | Endpoint / Feature | Status | Details |
| :--- | :--- | :--- | :--- |
| RSS Discovery Link | HTML `<head>` | ⚠️ WARNING | Missing alternate tag |
| RSS XML Endpoint | `/feed` | ⚠️ WARNING | HTTP 500, 0 items |
| Crawl Policy | `/robots.txt` | ⚠️ WARNING | HTTP 500 (Missing/Invalid) |
| XML Sitemap | `/sitemap.xml` | ⚠️ WARNING | Sitemap endpoint not implemented (HTTP 500) |

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
