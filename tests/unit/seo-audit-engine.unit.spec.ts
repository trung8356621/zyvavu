/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import {
  auditDiscovery,
  auditHttp,
  auditLinkGraph,
  auditSemantics,
  auditStructuredData,
  compareUrlPair,
  parseHtml,
  type HttpResponseData,
} from '../../scripts/seo-audit'

describe('SEO Parity Audit Engine', () => {
  describe('HTML Parser', () => {
    it('correctly extracts semantic tags, headings, canonical, and JSON-LD', () => {
      const sampleHtml = `
        <!DOCTYPE html>
        <html lang="vi">
          <head>
            <title>Trang Tiêu Đề Chính - Zyvavu</title>
            <meta name="description" content="Mô tả chuẩn SEO cho trang nội dung chất lượng cao." />
            <meta name="robots" content="index, follow" />
            <link rel="canonical" href="https://zyvavu.test/bai-viet.html" />
            <link rel="alternate" type="application/rss+xml" href="https://zyvavu.test/feed/" title="RSS" />
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@graph": [
                  { "@type": "WebPage", "@id": "https://zyvavu.test/bai-viet.html#webpage" }
                ]
              }
            </script>
          </head>
          <body>
            <header><a href="/">Trang chủ</a></header>
            <main>
              <h1>Tiêu đề bài viết</h1>
              <p>Nội dung đoạn văn đầu tiên.</p>
              <h2>Phần một</h2>
              <p>Chi tiết phần một.</p>
              <img src="/logo.png" alt="Logo thương hiệu" />
              <img src="/banner.png" />
              <a href="/category/cong-nghe">Chuyên mục công nghệ</a>
              <a href="https://google.com">Google ngoài</a>
            </main>
            <footer><p>Bản quyền 2026</p></footer>
          </body>
        </html>
      `
      const parsed = parseHtml(sampleHtml, 'https://zyvavu.test/bai-viet.html')

      expect(parsed.title).toBe('Trang Tiêu Đề Chính - Zyvavu')
      expect(parsed.metaDescription).toBe('Mô tả chuẩn SEO cho trang nội dung chất lượng cao.')
      expect(parsed.metaRobots).toBe('index, follow')
      expect(parsed.canonicalTags).toEqual(['https://zyvavu.test/bai-viet.html'])
      expect(parsed.rssAlternateUrl).toBe('https://zyvavu.test/feed/')
      expect(parsed.h1List).toEqual(['Tiêu đề bài viết'])
      expect(parsed.headings).toHaveLength(2)
      expect(parsed.hasMainTag).toBe(true)
      expect(parsed.hasHeaderTag).toBe(true)
      expect(parsed.hasFooterTag).toBe(true)
      expect(parsed.images).toHaveLength(2)
      expect(parsed.images[0].hasAlt).toBe(true)
      expect(parsed.images[1].hasAlt).toBe(false)
      expect(parsed.jsonLdRawScripts).toHaveLength(1)
      expect(parsed.links.some((l) => l.href === 'https://zyvavu.test/category/cong-nghe')).toBe(true)
    })
  })

  describe('HTTP & Canonical Auditor', () => {
    it('detects missing canonical and soft-404 on HTTP 200', () => {
      const mockRes: HttpResponseData = {
        url: 'https://zyvavu.test/missing-content',
        finalUrl: 'https://zyvavu.test/missing-content',
        statusCode: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/html' }),
        redirectHops: [],
        isRedirectLoop: false,
        bodyText: '<html><body>404 Not Found - Trang không tìm thấy</body></html>',
        timedOut: false,
      }
      const parsed = parseHtml(mockRes.bodyText, mockRes.url)
      const { result, findings } = auditHttp(mockRes, parsed)

      expect(result.isSoft404).toBe(true)
      expect(result.isIndexable).toBe(false)
      expect(findings.some((f) => f.id === 'HTTP_SOFT_404')).toBe(true)
      expect(findings.some((f) => f.id === 'CANONICAL_MISSING')).toBe(true)
    })

    it('detects multiple conflicting canonical tags', () => {
      const htmlWithDuplicateCanonicals = `
        <html>
          <head>
            <link rel="canonical" href="https://zyvavu.test/url-a" />
            <link rel="canonical" href="https://zyvavu.test/url-b" />
          </head>
          <body><h1>Test</h1></body>
        </html>
      `
      const mockRes: HttpResponseData = {
        url: 'https://zyvavu.test/url-a',
        finalUrl: 'https://zyvavu.test/url-a',
        statusCode: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/html' }),
        redirectHops: [],
        isRedirectLoop: false,
        bodyText: htmlWithDuplicateCanonicals,
        timedOut: false,
      }
      const parsed = parseHtml(mockRes.bodyText, mockRes.url)
      const { result, findings } = auditHttp(mockRes, parsed)

      expect(result.canonicalTagsCount).toBe(2)
      expect(findings.some((f) => f.id === 'CANONICAL_DUPLICATE')).toBe(true)
    })
  })

  describe('Semantic Auditor', () => {
    it('flags missing H1, skipped heading levels, and missing alt text', () => {
      const badHierarchyHtml = `
        <html>
          <head><title>Short</title></head>
          <body>
            <h2>Skipped to H2 without H1</h2>
            <h4>Skipped down to H4</h4>
            <img src="/test.jpg" />
          </body>
        </html>
      `
      const parsed = parseHtml(badHierarchyHtml, 'https://zyvavu.test/page')
      const { result, findings } = auditSemantics('https://zyvavu.test/page', parsed)

      expect(result.h1List).toHaveLength(0)
      expect(result.missingAltCount).toBe(1)
      expect(findings.some((f) => f.id === 'SEMANTIC_H1_MISSING')).toBe(true)
      expect(findings.some((f) => f.id === 'SEMANTIC_HEADING_HIERARCHY')).toBe(true)
      expect(findings.some((f) => f.id === 'SEMANTIC_IMG_ALT_MISSING')).toBe(true)
    })
  })

  describe('Structured Data Auditor', () => {
    it('validates graph relationships, detects broken entity IDs, and checks chronological dates', () => {
      const validGraphJson = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': 'https://zyvavu.test/#organization',
            name: 'Zyvavu Corp',
          },
          {
            '@type': 'WebSite',
            '@id': 'https://zyvavu.test/#website',
            name: 'Zyvavu',
            publisher: { '@id': 'https://zyvavu.test/#organization' },
          },
          {
            '@type': 'WebPage',
            '@id': 'https://zyvavu.test/post-1#webpage',
            name: 'Post One',
            isPartOf: { '@id': 'https://zyvavu.test/#website' },
          },
          {
            '@type': 'Article',
            '@id': 'https://zyvavu.test/post-1#article',
            headline: 'Post One',
            mainEntityOfPage: { '@id': 'https://zyvavu.test/post-1#webpage' },
            publisher: { '@id': 'https://zyvavu.test/#organization' },
            datePublished: '2026-10-15T08:00:00.000Z',
            dateModified: '2026-10-15T09:00:00.000Z',
          },
        ],
      })

      const html = `<html><head><script type="application/ld+json">${validGraphJson}</script></head><body></body></html>`
      const parsed = parseHtml(html, 'https://zyvavu.test/post-1')
      const { result, findings } = auditStructuredData('https://zyvavu.test/post-1', parsed)

      expect(result.hasOrganization).toBe(true)
      expect(result.hasWebSite).toBe(true)
      expect(result.hasWebPage).toBe(true)
      expect(result.hasArticle).toBe(true)
      expect(result.relationshipErrors).toHaveLength(0)
      expect(result.dateValidationErrors).toHaveLength(0)
      expect(findings.some((f) => f.id === 'SCHEMA_GRAPH_VALID')).toBe(true)
    })

    it('catches broken publisher @id references and inverted dates', () => {
      const brokenGraphJson = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': 'https://zyvavu.test/#organization',
          },
          {
            '@type': 'WebSite',
            '@id': 'https://zyvavu.test/#website',
            publisher: { '@id': 'https://zyvavu.test/#wrong-org' },
          },
          {
            '@type': 'Article',
            '@id': 'https://zyvavu.test/post-1#article',
            datePublished: '2026-10-15T12:00:00.000Z',
            dateModified: '2026-10-14T08:00:00.000Z', // Earlier than published!
          },
        ],
      })

      const html = `<html><head><script type="application/ld+json">${brokenGraphJson}</script></head><body></body></html>`
      const parsed = parseHtml(html, 'https://zyvavu.test/post-1')
      const { result, findings } = auditStructuredData('https://zyvavu.test/post-1', parsed)

      expect(result.relationshipErrors.length).toBeGreaterThan(0)
      expect(result.dateValidationErrors.length).toBeGreaterThan(0)
      expect(findings.some((f) => f.id === 'SCHEMA_RELATIONSHIP_BROKEN')).toBe(true)
      expect(findings.some((f) => f.id === 'SCHEMA_DATE_INVALID')).toBe(true)
    })
  })

  describe('Link Graph & Orphan Analysis', () => {
    it('detects orphan inventory URLs and non-canonical links', async () => {
      const homeHtml = `
        <html><body>
          <a href="/posts/page-a">Page A</a>
        </body></html>
      `
      const pageAHtml = `
        <html><head><link rel="canonical" href="https://zyvavu.test/canonical-a" /></head><body>
          <a href="/">Home</a>
        </body></html>
      `

      const initialMap = new Map()
      initialMap.set('https://zyvavu.test/', {
        parsed: parseHtml(homeHtml, 'https://zyvavu.test/'),
        statusCode: 200,
        finalUrl: 'https://zyvavu.test/',
      })
      initialMap.set('https://zyvavu.test/posts/page-a', {
        parsed: parseHtml(pageAHtml, 'https://zyvavu.test/posts/page-a'),
        statusCode: 200,
        finalUrl: 'https://zyvavu.test/posts/page-a',
        canonicalTag: 'https://zyvavu.test/canonical-a',
      })

      const inventory = [
        'https://zyvavu.test/posts/page-a',
        'https://zyvavu.test/posts/orphan-page-b',
      ]

      const { result, findings } = await auditLinkGraph('https://zyvavu.test/', {
        maxDepth: 2,
        maxPages: 5,
        urlInventory: inventory,
        initialParsedPages: initialMap,
      })

      expect(result.orphanUrls).toContain('https://zyvavu.test/posts/orphan-page-b')
      expect(result.nonCanonicalLinks.length).toBeGreaterThan(0)
      expect(findings.some((f) => f.id === 'LINK_ORPHAN_URLS')).toBe(true)
      expect(findings.some((f) => f.id === 'LINK_NON_CANONICAL')).toBe(true)
    })
  })
})
