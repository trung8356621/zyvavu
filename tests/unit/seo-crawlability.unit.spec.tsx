/**
 * @vitest-environment jsdom
 */
import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'

import { buildEntityGraph, buildNextMetadata, resolveSeoPageContext } from '@/lib/seo'
import { decideIndexability, isEligibleForSitemap } from '@/lib/seo/indexability'
import { buildRobotsTxt } from '@/lib/seo/robots'
import {
  buildResourceSitemap,
  buildSitemapIndex,
  renderSitemapIndex,
  renderUrlSet,
  SITEMAP_CHUNK_SIZE,
} from '@/lib/seo/sitemap'

type Row = Record<string, unknown>

function parseXml(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  expect(doc.querySelector('parsererror')).toBeNull()
  return doc
}

function createPayload(state: {
  settings?: Row
  routes?: Row[]
  pages?: Row[]
  posts?: Row[]
  categories?: Row[]
  tags?: Row[]
}): Payload {
  const settings = {
    siteName: 'Zyvavu',
    tagline: 'Studio',
    siteUrl: 'https://zyvavu.test',
    language: 'vi',
    pwaEnabled: false,
    setupComplete: true,
    ...state.settings,
  }
  const buckets: Record<string, Row[]> = {
    pages: state.pages || [],
    posts: state.posts || [],
    categories: state.categories || [],
    tags: state.tags || [],
  }
  const routes = state.routes || []

  return {
    findGlobal: async () => settings,
    findByID: async ({ collection, id }: { collection: string; id: number }) =>
      buckets[collection]?.find((doc) => doc.id === id) || null,
    find: async (args: { collection: string; where?: Row; limit?: number; page?: number }) => {
      if (args.collection === 'url-registry') {
        const and = Array.isArray(args.where?.and) ? (args.where?.and as Row[]) : []
        let matched = routes.filter((route) =>
          and.every((cond) => {
            if (cond.recordRole && (cond.recordRole as Row).equals) {
              return route.recordRole === (cond.recordRole as Row).equals
            }
            if (cond.resourceType && (cond.resourceType as Row).equals) {
              return route.resourceType === (cond.resourceType as Row).equals
            }
            if (cond.path && (cond.path as Row).equals) return route.path === (cond.path as Row).equals
            for (const field of ['page', 'post', 'category', 'tag']) {
              const clause = cond[field] as Row | undefined
              if (!clause) continue
              if (clause.equals !== undefined) return route[field] === clause.equals
              if (Array.isArray(clause.in)) return clause.in.includes(route[field])
            }
            return true
          }),
        )
        if (args.where?.path && (args.where.path as Row).equals) {
          matched = routes.filter((route) => route.path === (args.where?.path as Row).equals)
        }
        matched = [...matched].sort((a, b) => Number(a.id) - Number(b.id))
        const totalDocs = matched.length
        const limit = typeof args.limit === 'number' ? args.limit : totalDocs
        const page = typeof args.page === 'number' ? args.page : 1
        const start = (page - 1) * limit
        return { docs: matched.slice(start, start + limit), totalDocs }
      }

      const bucket = buckets[args.collection] || []
      const ids = (args.where?.id as Row | undefined)?.in as number[] | undefined
      const docs = ids ? bucket.filter((doc) => ids.includes(doc.id as number)) : bucket
      return { docs, totalDocs: docs.length }
    },
  } as unknown as Payload
}

const publishedPost = {
  id: 1,
  title: 'Public Post',
  slug: 'guessed-slug',
  _status: 'published',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-02T03:04:05.000Z',
}
const draftPost = {
  id: 2,
  title: 'Secret Draft',
  slug: 'secret-draft',
  _status: 'draft',
  updatedAt: '2026-10-03T00:00:00.000Z',
}
const noindexPost = {
  id: 3,
  title: 'Hidden Post',
  slug: 'hidden-post',
  _status: 'published',
  noindex: true,
  updatedAt: 'not-a-date',
}
const undatedPost = {
  id: 4,
  title: 'Undated',
  slug: 'undated',
  _status: 'published',
}
const page = {
  id: 10,
  title: 'About',
  slug: 'about',
  visibility: 'public',
  _status: 'published',
  updatedAt: '2026-09-01T00:00:00.000Z',
}
const privatePage = {
  id: 11,
  title: 'Private',
  slug: 'private',
  visibility: 'private',
  _status: 'published',
  updatedAt: '2026-09-02T00:00:00.000Z',
}
const noindexPage = {
  id: 12,
  title: 'Noindex About',
  slug: 'noindex-about',
  visibility: 'public',
  _status: 'published',
  noindex: true,
  updatedAt: '2026-09-03T00:00:00.000Z',
}

function fixturePayload() {
  return createPayload({
    routes: [
      { id: 1, path: '/kien-truc.html', recordRole: 'canonical', resourceType: 'post', post: 1 },
      { id: 2, path: '/old-kien-truc.html', recordRole: 'redirect', resourceType: 'post', post: 1, targetPath: '/kien-truc.html' },
      { id: 3, path: '/secret-draft.html', recordRole: 'canonical', resourceType: 'post', post: 2 },
      { id: 4, path: '/hidden.html', recordRole: 'canonical', resourceType: 'post', post: 3 },
      { id: 5, path: '/undated.html', recordRole: 'canonical', resourceType: 'post', post: 4 },
      { id: 6, path: '/missing.html', recordRole: 'canonical', resourceType: 'post', post: 404 },
      { id: 7, path: '/gioi-thieu', recordRole: 'canonical', resourceType: 'page', page: 10 },
      { id: 8, path: '/private', recordRole: 'canonical', resourceType: 'page', page: 11 },
      { id: 9, path: '/noindex-about', recordRole: 'canonical', resourceType: 'page', page: 12 },
      { id: 10, path: '/category/cong-nghe', recordRole: 'canonical', resourceType: 'category', category: 30 },
      { id: 11, path: '/tag/typescript', recordRole: 'canonical', resourceType: 'tag', tag: 40 },
    ],
    posts: [publishedPost, draftPost, noindexPost, undatedPost],
    pages: [page, privatePage, noindexPage],
    categories: [{ id: 30, title: 'Công nghệ', slug: 'cong-nghe', updatedAt: '2026-08-01T00:00:00.000Z' }],
    tags: [{ id: 40, title: 'TypeScript', slug: 'typescript' }],
  })
}

describe('SEO crawlability', () => {
  it('serves empty first chunks for all groups without fabricating content', async () => {
    const payload = createPayload({})
    const index = await buildSitemapIndex(payload)
    expect(index.entries.map((entry) => entry.group)).toEqual(['posts', 'pages', 'categories', 'tags'])
    for (const entry of index.entries) {
      const chunk = await buildResourceSitemap(payload, entry.group, 1)
      expect(chunk?.entries).toEqual([])
      expect(parseXml(chunk!.xml).documentElement.nodeName).toBe('urlset')
      expect(await buildResourceSitemap(payload, entry.group, 2)).toBeNull()
    }
  })

  it('escapes sitemap XML and omits fabricated lastmod', () => {
    const xml = renderUrlSet([
      { loc: 'https://zyvavu.test/a&b' },
      { loc: 'https://zyvavu.test/ok', lastmod: '2026-10-02T03:04:05.000Z' },
    ])
    const doc = parseXml(xml)
    expect(doc.documentElement.nodeName).toBe('urlset')
    const locs = [...doc.querySelectorAll('loc')].map((node) => node.textContent)
    expect(locs).toEqual(['https://zyvavu.test/a&b', 'https://zyvavu.test/ok'])
    expect(doc.querySelectorAll('lastmod')).toHaveLength(1)
    expect(xml).toContain('a&amp;b')
    expect(parseXml(renderSitemapIndex([])).documentElement.nodeName).toBe('sitemapindex')
  })

  it('builds a resource sitemap index and excludes unsafe URLs', async () => {
    const payload = fixturePayload()
    const index = await buildSitemapIndex(payload)
    const indexDoc = parseXml(index.xml)
    expect(indexDoc.documentElement.nodeName).toBe('sitemapindex')
    expect(index.entries.map((entry) => entry.loc)).toEqual([
      'https://zyvavu.test/sitemap/posts/1.xml',
      'https://zyvavu.test/sitemap/pages/1.xml',
      'https://zyvavu.test/sitemap/categories/1.xml',
      'https://zyvavu.test/sitemap/tags/1.xml',
    ])

    const posts = await buildResourceSitemap(payload, 'posts', 1)
    const pages = await buildResourceSitemap(payload, 'pages', 1)
    const categories = await buildResourceSitemap(payload, 'categories', 1)
    const tags = await buildResourceSitemap(payload, 'tags', 1)
    expect(posts?.locs).toEqual(['https://zyvavu.test/kien-truc.html', 'https://zyvavu.test/undated.html'])
    expect(pages?.locs).toEqual(['https://zyvavu.test/gioi-thieu'])
    expect(categories?.locs).toEqual(['https://zyvavu.test/category/cong-nghe'])
    expect(tags?.locs).toEqual(['https://zyvavu.test/tag/typescript'])

    const postDoc = parseXml(posts!.xml)
    const dated = [...postDoc.querySelectorAll('url')].find((node) => node.querySelector('loc')?.textContent?.endsWith('/kien-truc.html'))
    expect(dated?.querySelector('lastmod')?.textContent).toBe('2026-10-02T03:04:05.000Z')
    const undated = [...postDoc.querySelectorAll('url')].find((node) => node.querySelector('loc')?.textContent?.endsWith('/undated.html'))
    expect(undated?.querySelector('lastmod')).toBeNull()
    expect(posts?.xml).not.toContain('secret-draft')
    expect(posts?.xml).not.toContain('hidden')
    expect(posts?.xml).not.toContain('old-kien-truc')
    expect(posts?.xml).not.toContain('missing')
    expect(posts?.xml).not.toContain('guessed-slug')
    expect(pages?.xml).not.toContain('/private')
    expect(pages?.xml).not.toContain('noindex-about')
    expect(await buildResourceSitemap(payload, 'posts', 2)).toBeNull()
    expect(await buildResourceSitemap(payload, 'media', 1)).toBeNull()
  })

  it('splits canonical registry rows on chunk boundaries', async () => {
    const payload = createPayload({
      routes: [1, 2, 3].map((id) => ({
        id,
        path: `/post-${id}.html`,
        recordRole: 'canonical',
        resourceType: 'post',
        post: id,
      })),
      posts: [1, 2, 3].map((id) => ({
        id,
        title: `Post ${id}`,
        slug: `post-${id}`,
        _status: 'published',
        updatedAt: '2026-10-04T00:00:00.000Z',
      })),
    })
    const index = await buildSitemapIndex(payload, { chunkSize: 2 })
    expect(index.entries.map((entry) => entry.loc)).toEqual([
      'https://zyvavu.test/sitemap/posts/1.xml',
      'https://zyvavu.test/sitemap/posts/2.xml',
      'https://zyvavu.test/sitemap/pages/1.xml',
      'https://zyvavu.test/sitemap/categories/1.xml',
      'https://zyvavu.test/sitemap/tags/1.xml',
    ])
    const first = await buildResourceSitemap(payload, 'posts', 1, { chunkSize: 2 })
    const second = await buildResourceSitemap(payload, 'posts', 2, { chunkSize: 2 })
    expect(first?.locs).toEqual(['https://zyvavu.test/post-1.html', 'https://zyvavu.test/post-2.html'])
    expect(second?.locs).toEqual(['https://zyvavu.test/post-3.html'])
    expect(await buildResourceSitemap(payload, 'posts', 3, { chunkSize: 2 })).toBeNull()
    expect(SITEMAP_CHUNK_SIZE).toBe(1000)
  })

  it('uses one indexability decision for metadata, graph, and sitemap eligibility', async () => {
    const payload = fixturePayload()
    const context = await resolveSeoPageContext(payload, '/noindex-about')
    expect(context.status).toBe('ok')
    expect(context.canonicalUrl).toBe('https://zyvavu.test/noindex-about')
    expect(context.isIndexable).toBe(false)
    expect(buildEntityGraph(context)).toBeNull()
    const metadata = buildNextMetadata(context)
    expect(metadata.robots).toEqual({ index: false, follow: false })
    expect(metadata.alternates && 'canonical' in metadata.alternates ? metadata.alternates.canonical : undefined).toBe(
      'https://zyvavu.test/noindex-about',
    )
    expect(metadata.title).toBe('Noindex About — Zyvavu')

    const decision = decideIndexability({
      status: 'redirect',
      recordRole: 'redirect',
      canonicalPath: '/old',
    })
    expect(decision).toEqual({ indexable: false, reason: 'redirect', publicationDelay: null })
    expect(isEligibleForSitemap(decision)).toBe(false)
    expect(
      decideIndexability({
        status: 'ok',
        resourceType: 'category',
        doc: { id: 30, slug: 'cong-nghe' },
        canonicalPath: '/category/cong-nghe',
        recordRole: 'canonical',
      }).indexable,
    ).toBe(true)
  })

  it('allows crawlers only in production and always advertises the sitemap index', () => {
    expect(buildRobotsTxt('http://zyvavu.test', 'production')).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://zyvavu.test/sitemap.xml\n',
    )
    expect(buildRobotsTxt('https://zyvavu.test/ignored', 'development')).toContain('Disallow: /')
    expect(buildRobotsTxt('https://zyvavu.test', 'development')).toContain('Sitemap: https://zyvavu.test/sitemap.xml')
    expect(buildRobotsTxt('https://zyvavu.test', 'production')).not.toContain('Disallow')
  })
})
