/**
 * @vitest-environment node
 */
import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'

import { SeoSettings } from '@/globals/SeoSettings'
import { loadSeoAdminSnapshot } from '@/lib/seo/admin-status'
import { buildEntityGraph, resolveSeoPageContext } from '@/lib/seo'
import {
  normalizePublicSeoSettings,
  resolveHomeCopy,
  validatePublicHttpUrl,
  validateSeoSettingsInput,
} from '@/lib/seo/settings'

function payloadFor(seo: Record<string, unknown> = {}): Payload {
  return {
    findGlobal: async ({ slug }: { slug: string }) => {
      if (slug === 'settings') {
        return {
          siteName: 'Zyvavu',
          tagline: 'Studio',
          siteUrl: 'https://zyvavu.test',
          language: 'vi',
          pwaEnabled: false,
          setupComplete: true,
        }
      }
      if (slug === 'seo-settings') return seo
      return {}
    },
    find: async (args: { where?: { and?: Array<Record<string, { equals?: string }>> } }) => {
      const and = args.where?.and || []
      const role = and.find((item) => item.recordRole)?.recordRole?.equals
      const type = and.find((item) => item.resourceType)?.resourceType?.equals
      if (role === 'canonical' && type === 'post') return { docs: [], totalDocs: 4 }
      if (role === 'redirect' && type === 'post') return { docs: [], totalDocs: 1 }
      return { docs: [], totalDocs: 0 }
    },
    findByID: async () => null,
  } as unknown as Payload
}

describe('SEO settings', () => {
  it('keeps the existing homepage copy when overrides are empty', () => {
    const copy = resolveHomeCopy(
      { homeTitle: '  ', homeDescription: '' },
      { title: 'Zyvavu — Studio', description: 'Studio', documentTitle: 'Zyvavu' },
    )
    expect(copy.title).toBe('Zyvavu — Studio')
    expect(copy.description).toBe('Studio')
    expect(copy.homeFallbackTitle).toBe('Zyvavu — Studio')
  })

  it('applies homepage overrides and publisher data without changing the stable @id', async () => {
    const payload = payloadFor({
      homeTitle: 'Custom home',
      homeDescription: 'Custom description',
      publisherType: 'Person',
      publisherName: 'Ada',
      sameAs: [{ url: 'https://example.com/ada' }, { url: 'javascript:alert(1)' }],
    })
    const context = await resolveSeoPageContext(payload, '/')
    expect(context.title).toBe('Custom home')
    expect(context.description).toBe('Custom description')
    expect(context.homeFallbackTitle).toBe('Zyvavu — Studio')
    expect(context.homeFallbackDescription).toBe('Studio')

    const graph = buildEntityGraph(context)
    const publisher = graph!['@graph'].find((node) => node['@id'] === 'https://zyvavu.test/#organization')!
    expect(publisher['@type']).toBe('Person')
    expect(publisher.name).toBe('Ada')
    expect(publisher.sameAs).toEqual(['https://example.com/ada'])
    expect(graph!['@graph'].find((node) => node['@id'] === 'https://zyvavu.test/#website')!.publisher).toEqual({
      '@id': 'https://zyvavu.test/#organization',
    })
  })

  it('preserves the default Organization node when publisher settings are untouched', async () => {
    const context = await resolveSeoPageContext(payloadFor(), '/')
    expect(context.title).toBe('Zyvavu — Studio')
    const publisher = buildEntityGraph(context)!['@graph'].find((node) => node['@id'] === 'https://zyvavu.test/#organization')!
    expect(publisher['@type']).toBe('Organization')
    expect(publisher.name).toBe('Zyvavu')
    expect(publisher.sameAs).toBeUndefined()
  })

  it('rejects unsafe profile URLs and unauthorized updates', () => {
    expect(validatePublicHttpUrl('javascript:alert(1)')).not.toBe(true)
    expect(Object.keys(validateSeoSettingsInput({
      homeTitle: '',
      homeDescription: '',
      publisherType: 'Organization',
      publisherName: '',
      sameAs: ['https://user:pass@example.com/a'],
    }))).toContain('sameAs.0')
    expect(normalizePublicSeoSettings({ publisherType: 'nope', sameAs: [{ url: 'https://example.com/ok' }] })).toEqual({
      homeTitle: '',
      homeDescription: '',
      publisherType: 'Organization',
      publisherName: '',
      sameAs: ['https://example.com/ok'],
    })
    const access = SeoSettings.access
    expect(access?.update?.({ req: { user: null } } as never)).toBe(false)
    expect(access?.update?.({ req: { user: { role: 'site-admin' } } } as never)).toBe(true)
    expect(access?.read?.({} as never)).toBe(true)
  })

  it('reports live endpoint status and leaves publication delay unconfigured', async () => {
    const fetchImpl = (async (url: string) => {
      const body =
        String(url).endsWith('/robots.txt')
          ? 'User-agent: *\nDisallow: /\n\nSitemap: https://zyvavu.test/sitemap.xml\n'
          : String(url).endsWith('/sitemap.xml')
            ? '<sitemapindex></sitemapindex>'
            : '<rss version="2.0"></rss>'
      return new Response(body, { status: 200 })
    }) as typeof fetch

    const snapshot = await loadSeoAdminSnapshot(payloadFor(), {
      fetchImpl,
      environment: 'development',
    })
    expect(snapshot.origin).toBe('https://zyvavu.test')
    expect(snapshot.developmentCrawlBlocked).toBe(true)
    expect(snapshot.robots.available).toBe(true)
    expect(snapshot.sitemap.available).toBe(true)
    expect(snapshot.feed.available).toBe(true)
    expect(snapshot.publicationDelay).toBe('not-configured')
    expect(snapshot.registry.find((row) => row.resourceType === 'post')).toEqual({
      resourceType: 'post',
      canonical: 4,
      redirect: 1,
    })
    expect(snapshot.schemaAdapters.length).toBeGreaterThan(0)
  })
})
