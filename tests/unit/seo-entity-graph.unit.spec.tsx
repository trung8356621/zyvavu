/**
 * @vitest-environment node
 */
import type { Payload } from 'payload'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  buildEntityGraph,
  buildNextMetadata,
  buildRootLayoutMetadata,
  buildRssFeed,
  EntityGraphBuilder,
  generateRouteMetadata,
  handleRssFeedRequest,
  resolveSeoPageContext,
  SeoJsonLd,
  validateEntityGraph,
  type SchemaAdapter,
  type SchemaGraph,
} from '@/lib/seo'

type FixtureState = {
  settings?: Record<string, unknown>
  routes?: Array<Record<string, unknown>>
  pages?: Record<number, Record<string, unknown>>
  posts?: Record<number, Record<string, unknown>>
  categories?: Record<number, Record<string, unknown>>
  tags?: Record<number, Record<string, unknown>>
}

function createIsolatedPayloadFixture(state: FixtureState = {}): {
  payload: Payload
  lastFindArgs: Record<string, unknown>[]
} {
  const lastFindArgs: Record<string, unknown>[] = []

  const settings = {
    siteName: 'Zyvavu Studio',
    tagline: 'Precision Editorial Platform',
    siteUrl: 'https://zyvavu.test',
    language: 'vi',
    pwaEnabled: true,
    offlinePageLimit: 20,
    setupComplete: true,
    postPermalinkStructure: '/%postname%.html',
    pagePermalinkStructure: '/%slug%',
    categoryPermalinkStructure: '/category/%term%',
    tagPermalinkStructure: '/tag/%term%',
    ...state.settings,
  }

  const routes = state.routes || [
    {
      id: 1,
      path: '/gioi-thieu',
      recordRole: 'canonical',
      resourceType: 'page',
      page: 101,
    },
    {
      id: 2,
      path: '/old-gioi-thieu',
      recordRole: 'redirect',
      resourceType: 'page',
      page: 101,
      targetPath: '/gioi-thieu',
    },
    {
      id: 3,
      path: '/kien-truc-seo.html',
      recordRole: 'canonical',
      resourceType: 'post',
      post: 201,
    },
    {
      id: 4,
      path: '/bai-viet-khong-anh.html',
      recordRole: 'canonical',
      resourceType: 'post',
      post: 202,
    },
    {
      id: 5,
      path: '/category/cong-nghe',
      recordRole: 'canonical',
      resourceType: 'category',
      category: 301,
    },
    {
      id: 6,
      path: '/tag/typescript',
      recordRole: 'canonical',
      resourceType: 'tag',
      tag: 401,
    },
    // Stale canonical routes pointing to draft or private docs to verify strict non-leakage
    {
      id: 7,
      path: '/draft-post.html',
      recordRole: 'canonical',
      resourceType: 'post',
      post: 299,
    },
    {
      id: 8,
      path: '/private-page',
      recordRole: 'canonical',
      resourceType: 'page',
      page: 199,
    },
  ]

  const pages: Record<number, Record<string, unknown>> = state.pages || {
    101: {
      id: 101,
      title: 'Giới thiệu & Sứ mệnh',
      slug: 'gioi-thieu',
      excerpt: 'Tìm hiểu nền tảng xuất bản nội dung Zyvavu.',
      visibility: 'public',
      presentation: 'shared',
      _status: 'published',
      createdAt: '2026-10-10T08:00:00.000Z',
      updatedAt: '2026-10-12T10:30:00.000Z',
      layout: [
        {
          blockType: 'banner',
          heading: 'Banner Giới Thiệu',
          image: {
            id: 501,
            url: '/api/media/file/about-banner.jpg',
            alt: 'Ảnh bìa giới thiệu',
            width: 1200,
            height: 630,
            mimeType: 'image/jpeg',
          },
        },
      ],
    },
    199: {
      id: 199,
      title: 'Tài liệu Nội bộ Bí mật',
      slug: 'private-page',
      excerpt: 'Nội dung mật không được lộ ra SEO metadata hoặc JSON-LD.',
      visibility: 'private',
      presentation: 'shared',
      _status: 'published',
      createdAt: '2026-10-10T08:00:00.000Z',
      updatedAt: '2026-10-12T10:30:00.000Z',
    },
  }

  const categories: Record<number, Record<string, unknown>> = state.categories || {
    301: {
      id: 301,
      title: 'Công nghệ',
      slug: 'cong-nghe',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-11T09:00:00.000Z',
    },
  }

  const tags: Record<number, Record<string, unknown>> = state.tags || {
    401: {
      id: 401,
      title: 'TypeScript',
      slug: 'typescript',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-11T09:00:00.000Z',
    },
  }

  const posts: Record<number, Record<string, unknown>> = state.posts || {
    201: {
      id: 201,
      title: 'Kiến trúc SEO Entity Graph chuẩn xác',
      slug: 'kien-truc-seo',
      excerpt: 'Phân tích thiết kế lớp ngữ nghĩa JSON-LD độc lập giao diện.',
      _status: 'published',
      createdAt: '2026-10-14T07:15:00.000Z',
      updatedAt: '2026-10-15T14:20:00.000Z',
      categories: [categories[301]],
      tags: [tags[401]],
      content: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: 'Bài viết phân tích chi tiết cách xây dựng đồ thị thực thể SEO liên kết chặt chẽ qua định danh ổn định.',
                },
              ],
            },
            {
              type: 'upload',
              relationTo: 'media',
              value: {
                id: 502,
                url: '/api/media/file/seo-graph-diagram.png',
                alt: 'Sơ đồ Entity Graph',
                width: 1600,
                height: 900,
                mimeType: 'image/png',
              },
            },
          ],
        },
      },
    },
    202: {
      id: 202,
      title: 'Bài viết thuần văn bản & <Ký tự đặc biệt> "RSS"',
      slug: 'bai-viet-khong-anh',
      excerpt: null,
      _status: 'published',
      createdAt: '2026-10-13T06:00:00.000Z',
      updatedAt: '2026-10-13T06:00:00.000Z',
      categories: [],
      tags: [],
      content: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: 'Nội dung trích xuất tự động từ Lexical khi excerpt trống & kiểm tra <escaping>.',
                },
              ],
            },
          ],
        },
      },
    },
    299: {
      id: 299,
      title: 'Bản nháp Chưa Xuất Bản',
      slug: 'draft-post',
      excerpt: 'Bản nháp tuyệt mật không được phép xuất hiện trên public web hay RSS feed.',
      _status: 'draft',
      createdAt: '2026-10-16T01:00:00.000Z',
      updatedAt: '2026-10-16T02:00:00.000Z',
    },
  }

  const mockPayload = {
    findGlobal: async ({ slug }: { slug: string }) => {
      if (slug === 'settings') return settings
      return {}
    },
    findByID: async ({
      collection,
      id,
    }: {
      collection: string
      id: number
    }) => {
      if (collection === 'pages') return pages[id] || null
      if (collection === 'posts') return posts[id] || null
      if (collection === 'categories') return categories[id] || null
      if (collection === 'tags') return tags[id] || null
      return null
    },
    find: async (args: Record<string, unknown>) => {
      lastFindArgs.push(args)
      const collection = args.collection as string
      const where = (args.where || {}) as Record<string, any>

      if (collection === 'url-registry') {
        if (where.path?.equals) {
          const matched = routes.filter((r) => r.path === where.path.equals)
          return { docs: matched, totalDocs: matched.length }
        }
        if (Array.isArray(where.and)) {
          const matched = routes.filter((r) => {
            return where.and.every((cond: Record<string, any>) => {
              if (cond.recordRole?.equals) return r.recordRole === cond.recordRole.equals
              if (cond.resourceType?.equals) return r.resourceType === cond.resourceType.equals
              for (const field of ['page', 'post', 'category', 'tag']) {
                if (cond[field]?.equals !== undefined) return r[field] === cond[field].equals
                if (Array.isArray(cond[field]?.in)) return cond[field].in.includes(r[field])
              }
              return true
            })
          })
          return { docs: matched, totalDocs: matched.length }
        }
        return { docs: routes, totalDocs: routes.length }
      }

      if (collection === 'posts') {
        let allPosts = Object.values(posts)
        if (where._status?.equals === 'published') {
          allPosts = allPosts.filter((p) => p._status === 'published')
        }
        const limit = typeof args.limit === 'number' ? args.limit : 20
        const sliced = allPosts.slice(0, limit)
        return { docs: sliced, totalDocs: sliced.length, page: 1, totalPages: 1 }
      }

      return { docs: [], totalDocs: 0 }
    },
  } as unknown as Payload

  return { payload: mockPayload, lastFindArgs }
}

function renderSimulatedServerHtml(
  context: Awaited<ReturnType<typeof resolveSeoPageContext>>,
  graph: SchemaGraph | null,
): string {
  const metadata = buildNextMetadata(context)
  const robots = metadata.robots as { index?: boolean; follow?: boolean } | undefined
  const canonical = (metadata.alternates as { canonical?: string } | undefined)?.canonical
  const rssAlt = (
    metadata.alternates as {
      types?: { 'application/rss+xml'?: Array<{ url: string; title?: string }> }
    }
  )?.types?.['application/rss+xml']?.[0]
  const og = metadata.openGraph as Record<string, any> | undefined
  const twitter = metadata.twitter as Record<string, any> | undefined

  const element = (
    <html lang={context.site.language}>
      <head>
        <title>{String(metadata.title || '')}</title>
        {metadata.description ? (
          <meta name="description" content={String(metadata.description)} />
        ) : null}
        {robots ? (
          <meta
            name="robots"
            content={`${robots.index ? 'index' : 'noindex'}, ${robots.follow ? 'follow' : 'nofollow'}`}
          />
        ) : null}
        {canonical ? <link rel="canonical" href={canonical} /> : null}
        {rssAlt ? (
          <link
            rel="alternate"
            type="application/rss+xml"
            title={rssAlt.title}
            href={rssAlt.url}
          />
        ) : null}
        {og?.title ? <meta property="og:title" content={String(og.title)} /> : null}
        {og?.description ? (
          <meta property="og:description" content={String(og.description)} />
        ) : null}
        {og?.url ? <meta property="og:url" content={String(og.url)} /> : null}
        {og?.type ? <meta property="og:type" content={String(og.type)} /> : null}
        {twitter?.card ? <meta name="twitter:card" content={String(twitter.card)} /> : null}
      </head>
      <body>
        <main>
          <SeoJsonLd graph={graph} />
          <h1>{context.documentTitle}</h1>
        </main>
      </body>
    </html>
  )

  return `<!DOCTYPE html>${renderToStaticMarkup(element)}`
}

describe('SEO Entity Graph Core V1', () => {
  describe('1. Centralized SEO Page Context & Entity Graph across public resources', () => {
    it('builds valid Home context, metadata, and JSON-LD @graph with Organization,Logo, WebSite, and CollectionPage', async () => {
      const { payload } = createIsolatedPayloadFixture({
        settings: {
          logo: {
            id: 500,
            url: '/api/media/file/brand-logo.png',
            alt: 'Zyvavu Brand Logo',
            width: 400,
            height: 120,
            mimeType: 'image/png',
          },
        },
      })

      const context = await resolveSeoPageContext(payload, '/')
      expect(context.status).toBe('ok')
      expect(context.resourceType).toBe('home')
      expect(context.isIndexable).toBe(true)
      expect(context.canonicalPath).toBe('/')
      expect(context.canonicalUrl).toBe('https://zyvavu.test/')
      expect(context.title).toBe('Zyvavu Studio — Precision Editorial Platform')
      expect(context.breadcrumbs).toEqual([])

      const graph = buildEntityGraph(context)
      expect(graph).not.toBeNull()
      const validation = validateEntityGraph(graph)
      expect(validation.valid).toBe(true)
      expect(validation.duplicateIds).toEqual([])
      expect(validation.danglingReferences).toEqual([])

      const ids = graph!['@graph'].map((n) => n['@id'])
      expect(ids).toContain('https://zyvavu.test/#organization')
      expect(ids).toContain('https://zyvavu.test/#logo')
      expect(ids).toContain('https://zyvavu.test/#website')
      expect(ids).toContain('https://zyvavu.test/#webpage')
      expect(ids).not.toContain('https://zyvavu.test/#breadcrumb')

      const webpage = graph!['@graph'].find((n) => n['@id'] === 'https://zyvavu.test/#webpage')!
      expect(webpage['@type']).toBe('CollectionPage')
      expect(webpage.about).toEqual({ '@id': 'https://zyvavu.test/#organization' })
      expect(webpage.isPartOf).toEqual({ '@id': 'https://zyvavu.test/#website' })
      expect(webpage.breadcrumb).toBeUndefined()

      const html = renderSimulatedServerHtml(context, graph)
      expect(html).toContain('<link rel="canonical" href="https://zyvavu.test/"/>')
      expect(html).toContain(
        '<link rel="alternate" type="application/rss+xml" title="Zyvavu Studio RSS Feed" href="https://zyvavu.test/feed/"/>',
      )
      expect(html).toContain('<script id="zyvavu-seo-schema" type="application/ld+json">')
    })

    it('omits #logo ImageObject when site settings has no logo and leaves zero dangling references', async () => {
      const { payload } = createIsolatedPayloadFixture()
      const context = await resolveSeoPageContext(payload, '/')
      const graph = buildEntityGraph(context)!
      const validation = validateEntityGraph(graph)

      expect(validation.valid).toBe(true)
      expect(graph['@graph'].some((n) => n['@id'] === 'https://zyvavu.test/#logo')).toBe(false)
      const org = graph['@graph'].find((n) => n['@id'] === 'https://zyvavu.test/#organization')!
      expect(org.logo).toBeUndefined()
      expect(org.image).toBeUndefined()
    })

    it('builds valid published Post context, metadata, and @graph with BlogPosting, ImageObject, BreadcrumbList, and WebPage', async () => {
      const { payload } = createIsolatedPayloadFixture()
      const context = await resolveSeoPageContext(payload, '/kien-truc-seo.html')

      expect(context.status).toBe('ok')
      expect(context.resourceType).toBe('post')
      expect(context.isIndexable).toBe(true)
      expect(context.canonicalUrl).toBe('https://zyvavu.test/kien-truc-seo.html')
      expect(context.publishedAt).toBe('2026-10-14T07:15:00.000Z')
      expect(context.modifiedAt).toBe('2026-10-15T14:20:00.000Z')
      expect(context.primaryImage).toEqual({
        url: 'https://zyvavu.test/api/media/file/seo-graph-diagram.png',
        width: 1600,
        height: 900,
        caption: 'Sơ đồ Entity Graph',
        mimeType: 'image/png',
      })
      expect(context.breadcrumbs).toEqual([
        { name: 'Zyvavu Studio', url: 'https://zyvavu.test/' },
        { name: 'Công nghệ', url: 'https://zyvavu.test/category/cong-nghe' },
        {
          name: 'Kiến trúc SEO Entity Graph chuẩn xác',
          url: 'https://zyvavu.test/kien-truc-seo.html',
        },
      ])

      const graph = buildEntityGraph(context)!
      const validation = validateEntityGraph(graph)
      expect(validation.valid).toBe(true)

      const article = graph['@graph'].find(
        (n) => n['@id'] === 'https://zyvavu.test/kien-truc-seo.html#article',
      )!
      expect(article['@type']).toBe('BlogPosting')
      expect(article.headline).toBe('Kiến trúc SEO Entity Graph chuẩn xác')
      expect(article.datePublished).toBe('2026-10-14T07:15:00.000Z')
      expect(article.dateModified).toBe('2026-10-15T14:20:00.000Z')
      expect(article.publisher).toEqual({ '@id': 'https://zyvavu.test/#organization' })
      expect(article.isPartOf).toEqual({
        '@id': 'https://zyvavu.test/kien-truc-seo.html#webpage',
      })
      expect(article.mainEntityOfPage).toEqual({
        '@id': 'https://zyvavu.test/kien-truc-seo.html#webpage',
      })
      expect(article.image).toEqual({
        '@id': 'https://zyvavu.test/kien-truc-seo.html#primaryimage',
      })
      expect(article.articleSection).toEqual(['Công nghệ'])
      expect(article.keywords).toBe('TypeScript')
      expect(article.wordCount).toBeGreaterThan(5)

      // Strict check: no fabricated author, rating, review, address, or FAQ
      expect(article.author).toBeUndefined()
      expect(article.aggregateRating).toBeUndefined()
      expect(article.review).toBeUndefined()

      const html = renderSimulatedServerHtml(context, graph)
      expect(html).toContain('<meta property="og:type" content="article"/>')
      expect(html).toContain('<meta name="twitter:card" content="summary_large_image"/>')
      expect(html).toContain(
        '<link rel="canonical" href="https://zyvavu.test/kien-truc-seo.html"/>',
      )
    })

    it('omits ImageObject when published Post has no image and keeps @graph references valid', async () => {
      const { payload } = createIsolatedPayloadFixture()
      const context = await resolveSeoPageContext(payload, '/bai-viet-khong-anh.html')

      expect(context.status).toBe('ok')
      expect(context.primaryImage).toBeUndefined()
      expect(context.description).toContain('Nội dung trích xuất tự động từ Lexical')

      const graph = buildEntityGraph(context)!
      const validation = validateEntityGraph(graph)
      expect(validation.valid).toBe(true)

      expect(
        graph['@graph'].some((n) =>
          String(n['@id']).endsWith('#primaryimage'),
        ),
      ).toBe(false)

      const article = graph['@graph'].find(
        (n) => n['@id'] === 'https://zyvavu.test/bai-viet-khong-anh.html#article',
      )!
      expect(article.image).toBeUndefined()
    })

    it('builds valid published Page context and @graph with WebPage, ImageObject, and BreadcrumbList (no BlogPosting)', async () => {
      const { payload } = createIsolatedPayloadFixture()
      const context = await resolveSeoPageContext(payload, '/gioi-thieu')

      expect(context.status).toBe('ok')
      expect(context.resourceType).toBe('page')
      expect(context.canonicalUrl).toBe('https://zyvavu.test/gioi-thieu')

      const graph = buildEntityGraph(context)!
      const validation = validateEntityGraph(graph)
      expect(validation.valid).toBe(true)

      const webpage = graph['@graph'].find(
        (n) => n['@id'] === 'https://zyvavu.test/gioi-thieu#webpage',
      )!
      expect(webpage['@type']).toBe('WebPage')
      expect(webpage.primaryImageOfPage).toEqual({
        '@id': 'https://zyvavu.test/gioi-thieu#primaryimage',
      })
      expect(webpage.breadcrumb).toEqual({
        '@id': 'https://zyvavu.test/gioi-thieu#breadcrumb',
      })
      expect(graph['@graph'].some((n) => n['@type'] === 'BlogPosting')).toBe(false)
    })

    it('builds valid Category and Tag archive contexts with CollectionPage and BreadcrumbList', async () => {
      const { payload } = createIsolatedPayloadFixture()

      const catContext = await resolveSeoPageContext(payload, '/category/cong-nghe')
      expect(catContext.status).toBe('ok')
      expect(catContext.resourceType).toBe('category')
      expect(catContext.canonicalUrl).toBe('https://zyvavu.test/category/cong-nghe')

      const catGraph = buildEntityGraph(catContext)!
      expect(validateEntityGraph(catGraph).valid).toBe(true)
      const catWebpage = catGraph['@graph'].find(
        (n) => n['@id'] === 'https://zyvavu.test/category/cong-nghe#webpage',
      )!
      expect(catWebpage['@type']).toBe('CollectionPage')

      const tagContext = await resolveSeoPageContext(payload, '/tag/typescript')
      expect(tagContext.status).toBe('ok')
      expect(tagContext.resourceType).toBe('tag')
      expect(tagContext.canonicalUrl).toBe('https://zyvavu.test/tag/typescript')

      const tagGraph = buildEntityGraph(tagContext)!
      expect(validateEntityGraph(tagGraph).valid).toBe(true)
      const tagWebpage = tagGraph['@graph'].find(
        (n) => n['@id'] === 'https://zyvavu.test/tag/typescript#webpage',
      )!
      expect(tagWebpage['@type']).toBe('CollectionPage')
    })
  })

  describe('2. Non-leakage for Redirects, Drafts, Private Pages, and 404 Routes', () => {
    it('never leaks draft post, private page, redirect, or missing route content into metadata or JSON-LD graph', async () => {
      const { payload } = createIsolatedPayloadFixture()

      // 1. Redirect route
      const redirectCtx = await resolveSeoPageContext(payload, '/old-gioi-thieu')
      expect(redirectCtx.status).toBe('redirect')
      expect(redirectCtx.redirectTarget).toBe('/gioi-thieu')
      expect(redirectCtx.isIndexable).toBe(false)
      expect(buildEntityGraph(redirectCtx)).toBeNull()

      // 2. Draft post
      const draftCtx = await resolveSeoPageContext(payload, '/draft-post.html')
      expect(draftCtx.status).toBe('not_found')
      expect(draftCtx.isIndexable).toBe(false)
      expect(buildEntityGraph(draftCtx)).toBeNull()
      const draftMeta = await generateRouteMetadata(payload, '/draft-post.html')
      expect(draftMeta.robots).toEqual({ index: false, follow: false })
      expect((draftMeta.alternates as any)?.canonical).toBeUndefined()
      expect(draftMeta.openGraph).toBeUndefined()
      const draftHtml = renderSimulatedServerHtml(draftCtx, buildEntityGraph(draftCtx))
      expect(draftHtml).not.toContain('Bản nháp Chưa Xuất Bản')
      expect(draftHtml).not.toContain('tuyệt mật')
      expect(draftHtml).not.toContain('application/ld+json')
      expect(draftHtml).toContain('<meta name="robots" content="noindex, nofollow"/>')

      // 3. Private page
      const privateCtx = await resolveSeoPageContext(payload, '/private-page')
      expect(privateCtx.status).toBe('not_found')
      expect(privateCtx.isIndexable).toBe(false)
      expect(buildEntityGraph(privateCtx)).toBeNull()
      const privateHtml = renderSimulatedServerHtml(privateCtx, buildEntityGraph(privateCtx))
      expect(privateHtml).not.toContain('Tài liệu Nội bộ Bí mật')
      expect(privateHtml).not.toContain('Nội dung mật')
      expect(privateHtml).not.toContain('application/ld+json')

      // 4. Missing 404 route
      const missingCtx = await resolveSeoPageContext(payload, '/khong-ton-tai-404')
      expect(missingCtx.status).toBe('not_found')
      expect(missingCtx.isIndexable).toBe(false)
      expect(buildEntityGraph(missingCtx)).toBeNull()
    })
  })

  describe('3. Graph Deduplication, Reference Pruning & Modular Adapter Extensibility', () => {
    it('deduplicates nodes sharing the same @id, prunes dangling @id references, and supports custom schema adapters', async () => {
      const { payload } = createIsolatedPayloadFixture()
      const context = await resolveSeoPageContext(payload, '/gioi-thieu')

      const customProductAdapter: SchemaAdapter = {
        name: 'custom-product-and-dangling-test',
        supports: (ctx) => ctx.resourceType === 'page',
        build: (ctx, ids) => [
          // Duplicate @id with extra property to test merge deduplication
          {
            '@type': 'Organization',
            '@id': ids.organizationId,
            sameAs: ['https://github.com/zyvavu'],
          },
          // Custom typed entity referencing existing #webpage and a non-existent #missing-offer
          {
            '@type': 'Product',
            '@id': ids.entityId('product'),
            name: 'Zyvavu Enterprise',
            mainEntityOfPage: { '@id': ids.webpageId! },
            offers: { '@id': 'https://zyvavu.test/#missing-offer' },
          },
        ],
      }

      const builder = new EntityGraphBuilder().registerAdapter(customProductAdapter)
      const graph = builder.build(context)!
      const validation = validateEntityGraph(graph)

      expect(validation.valid).toBe(true)
      expect(validation.duplicateIds).toEqual([])
      expect(validation.danglingReferences).toEqual([])

      const orgNodes = graph['@graph'].filter(
        (n) => n['@id'] === 'https://zyvavu.test/#organization',
      )
      expect(orgNodes).toHaveLength(1)
      expect(orgNodes[0].sameAs).toEqual(['https://github.com/zyvavu'])

      const productNode = graph['@graph'].find(
        (n) => n['@id'] === 'https://zyvavu.test/gioi-thieu#product',
      )!
      expect(productNode['@type']).toBe('Product')
      expect(productNode.mainEntityOfPage).toEqual({
        '@id': 'https://zyvavu.test/gioi-thieu#webpage',
      })
      // Dangling reference to #missing-offer was automatically pruned
      expect(productNode.offers).toBeUndefined()
    })
  })

  describe('4. Lightweight RSS 2.0 Feed (/feed/) & Conditional HTTP Caching', () => {
    it('generates valid RSS 2.0 XML for published posts only with bounded query, real canonical URLs, XML escaping, and ETag/Last-Modified 304 caching', async () => {
      const { payload, lastFindArgs } = createIsolatedPayloadFixture()

      const feed = await buildRssFeed(payload, { limit: 100 })
      const postQuery = lastFindArgs.find((q) => q.collection === 'posts')
      expect(postQuery).toBeDefined()
      expect(postQuery?.limit).toBe(50) // Bounded to MAX_FEED_LIMIT = 50

      // Includes only the 2 published posts with canonical paths, never the draft post
      expect(feed.items).toHaveLength(2)
      expect(feed.xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(feed.xml).toContain('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">')
      expect(feed.xml).toContain(
        '<atom:link href="https://zyvavu.test/feed/" rel="self" type="application/rss+xml" />',
      )
      expect(feed.xml).toContain('<link>https://zyvavu.test/kien-truc-seo.html</link>')
      expect(feed.xml).toContain(
        '<guid isPermaLink="true">https://zyvavu.test/kien-truc-seo.html</guid>',
      )
      expect(feed.xml).toContain('<category>Công nghệ</category>')
      // Proper XML escaping of &, <, >, "
      expect(feed.xml).toContain(
        'Bài viết thuần văn bản &amp; &lt;Ký tự đặc biệt&gt; &quot;RSS&quot;',
      )
      expect(feed.xml).toContain('kiểm tra &lt;escaping&gt;.')
      // Never leaks draft post
      expect(feed.xml).not.toContain('Bản nháp Chưa Xuất Bản')
      expect(feed.xml).not.toContain('draft-post.html')

      // Test HTTP response & conditional caching
      const req1 = new Request('https://zyvavu.test/feed/', { method: 'GET' })
      const res1 = await handleRssFeedRequest(req1, payload)
      expect(res1.status).toBe(200)
      expect(res1.headers.get('Content-Type')).toBe('application/rss+xml; charset=utf-8')
      const etag = res1.headers.get('ETag')
      const lastModified = res1.headers.get('Last-Modified')
      expect(etag).toBeTruthy()
      expect(lastModified).toBe('Thu, 15 Oct 2026 14:20:00 GMT')

      // Conditional request via If-None-Match -> 304 Not Modified
      const reqEtag = new Request('https://zyvavu.test/feed/', {
        method: 'GET',
        headers: { 'If-None-Match': etag! },
      })
      const resEtag = await handleRssFeedRequest(reqEtag, payload)
      expect(resEtag.status).toBe(304)
      expect(await resEtag.text()).toBe('')

      // Conditional request via If-Modified-Since -> 304 Not Modified
      const reqMod = new Request('https://zyvavu.test/feed/', {
        method: 'GET',
        headers: { 'If-Modified-Since': lastModified! },
      })
      const resMod = await handleRssFeedRequest(reqMod, payload)
      expect(resMod.status).toBe(304)

      // Root layout metadata exposes feed discovery alternate link
      const rootMeta = buildRootLayoutMetadata((await resolveSeoPageContext(payload, '/')).site)
      expect(
        (rootMeta.alternates as any)?.types?.['application/rss+xml']?.[0]?.url,
      ).toBe('https://zyvavu.test/feed/')
    })
  })
})
