/**
 * @vitest-environment jsdom
 */
import type { Payload } from 'payload'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { metadata } from '@/app/(sitemap)/layout'
import { SitemapChunkView, SitemapIndexView } from '@/components/frontend/sitemap/SitemapViews'
import { loadSitemapChunkView, loadSitemapIndexView } from '@/lib/seo/sitemap-view'
import { buildResourceSitemap } from '@/lib/seo/sitemap'

type Row = Record<string, unknown>

function createPayload(): Payload {
  const routes = [
    { id: 1, path: '/public.html', recordRole: 'canonical', resourceType: 'post', post: 1 },
    { id: 2, path: '/old.html', recordRole: 'redirect', resourceType: 'post', post: 1, targetPath: '/public.html' },
    { id: 3, path: '/draft.html', recordRole: 'canonical', resourceType: 'post', post: 2 },
    { id: 4, path: '/hidden.html', recordRole: 'canonical', resourceType: 'post', post: 3 },
    { id: 5, path: '/second.html', recordRole: 'canonical', resourceType: 'post', post: 4 },
    { id: 6, path: '/third.html', recordRole: 'canonical', resourceType: 'post', post: 5 },
    { id: 7, path: '/private', recordRole: 'canonical', resourceType: 'page', page: 11 },
    { id: 8, path: '/gioi-thieu', recordRole: 'canonical', resourceType: 'page', page: 10 },
  ]
  const posts = [
    { id: 1, slug: 'guessed', _status: 'published', updatedAt: '2026-10-02T03:04:05.000Z' },
    { id: 2, slug: 'draft', _status: 'draft', updatedAt: '2026-10-03T00:00:00.000Z' },
    { id: 3, slug: 'hidden', _status: 'published', noindex: true, updatedAt: '2026-10-04T00:00:00.000Z' },
    { id: 4, slug: 'second', _status: 'published' },
    { id: 5, slug: 'third', _status: 'published', updatedAt: '2026-10-05T00:00:00.000Z' },
  ]
  const pages = [
    { id: 10, slug: 'gioi-thieu', visibility: 'public', _status: 'published', updatedAt: '2026-09-01T00:00:00.000Z' },
    { id: 11, slug: 'private', visibility: 'private', _status: 'published', updatedAt: '2026-09-02T00:00:00.000Z' },
  ]
  return {
    findGlobal: async () => ({
      siteName: 'Zyvavu',
      tagline: '',
      siteUrl: 'https://zyvavu.test',
      language: 'vi',
      pwaEnabled: false,
      setupComplete: true,
    }),
    find: async (args: { collection: string; where?: Row; limit?: number; page?: number }) => {
      if (args.collection === 'url-registry') {
        const and = Array.isArray(args.where?.and) ? (args.where?.and as Row[]) : []
        let matched = routes.filter((route) =>
          and.every((cond) => {
            if (cond.recordRole && (cond.recordRole as Row).equals) return route.recordRole === (cond.recordRole as Row).equals
            if (cond.resourceType && (cond.resourceType as Row).equals) return route.resourceType === (cond.resourceType as Row).equals
            return true
          }),
        )
        matched = [...matched].sort((a, b) => Number(a.id) - Number(b.id))
        const limit = typeof args.limit === 'number' ? args.limit : matched.length
        const page = typeof args.page === 'number' ? args.page : 1
        const start = (page - 1) * limit
        return { docs: matched.slice(start, start + limit), totalDocs: matched.length }
      }
      const bucket = args.collection === 'posts' ? posts : args.collection === 'pages' ? pages : []
      const ids = (args.where?.id as Row | undefined)?.in as number[] | undefined
      const docs = ids ? bucket.filter((doc) => ids.includes(doc.id as number)) : bucket
      return { docs, totalDocs: docs.length }
    },
  } as unknown as Payload
}

describe('sitemap viewer', () => {
  it('marks the viewer noindex and renders only canonical indexable URLs', async () => {
    expect(metadata.robots).toEqual({ index: false, follow: false })
    const payload = createPayload()
    const rows = await loadSitemapIndexView(payload, { chunkSize: 2 })
    const html = renderToStaticMarkup(<SitemapIndexView rows={rows} />)
    expect(html).toContain('Sơ đồ trang web XML')
    expect(html).toContain('<table>')
    expect(html).toContain('href="/sitemap-view/posts/1"')
    expect(html).toContain('href="/sitemap/posts/1.xml?raw=1"')
    expect(html).toContain('href="/sitemap.xml?raw=1"')
    for (const row of rows) {
      expect(html).toContain(`href="${row.viewPath}"`)
      expect(html).toContain(`href="${row.xmlPath}?raw=1"`)
    }
    expect(new DOMParser().parseFromString(html, 'text/html').querySelector('time')?.dateTime).toBe('2026-10-02T03:04:05.000Z')
    expect(html).toContain(' UTC</time>')
    expect(html).not.toContain('xsl:')
    expect(html).not.toContain('/draft.html')
    expect(html).not.toContain('/hidden.html')
    expect(html).not.toContain('/old.html')
    expect(html).not.toContain('/private')
    const postRows = rows.filter((row) => row.group === 'posts')
    expect(postRows.map((row) => row.urlCount)).toEqual([1, 1, 1])
    expect(postRows[0]?.lastmod).toBe('2026-10-02T03:04:05.000Z')
    expect(postRows[1]?.lastmod).toBeUndefined()
    expect(postRows[2]?.lastmod).toBe('2026-10-05T00:00:00.000Z')
  })

  it('paginates chunks with the same URLs as the raw sitemap', async () => {
    const payload = createPayload()
    const first = await loadSitemapChunkView(payload, 'posts', 1, { chunkSize: 2 })
    const second = await loadSitemapChunkView(payload, 'posts', 2, { chunkSize: 2 })
    const xml = await buildResourceSitemap(payload, 'posts', 2, { chunkSize: 2 })
    expect(first?.entries.map((entry) => entry.loc)).toEqual(['https://zyvavu.test/public.html'])
    expect(second?.entries.map((entry) => entry.loc)).toEqual(xml?.locs)
    expect(second?.entries.map((entry) => entry.loc)).toEqual(['https://zyvavu.test/second.html'])
    expect(await loadSitemapChunkView(payload, 'posts', 4, { chunkSize: 2 })).toBeNull()
    const pageHtml = renderToStaticMarkup(<SitemapChunkView view={second!} />)
    expect(pageHtml).toContain('href="https://zyvavu.test/second.html"')
    expect(pageHtml).toContain('href="/sitemap-view/posts/1"')
    expect(pageHtml).toContain('href="/sitemap-view/posts/3"')
    expect(pageHtml).toContain('href="/sitemap/posts/2.xml?raw=1"')
    expect(pageHtml).toContain('>—</td>')
    expect(pageHtml).not.toContain('/draft.html')
    expect(pageHtml).not.toContain('xsl:')
    const firstHtml = renderToStaticMarkup(<SitemapChunkView view={first!} />)
    expect(firstHtml).toContain('href="https://zyvavu.test/public.html"')
    expect(new DOMParser().parseFromString(firstHtml, 'text/html').querySelector('time')?.dateTime).toBe('2026-10-02T03:04:05.000Z')
  })
})
