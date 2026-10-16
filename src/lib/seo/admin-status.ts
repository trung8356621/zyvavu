import type { Payload } from 'payload'

import { loadPublicSiteSettings } from '@/lib/site/settings'
import type { ResourceType } from '@/lib/url/paths'

import { resolveSeoPageContext } from './context'
import { buildRobotsTxt } from './robots'
import { buildSitemapIndex } from './sitemap'
import { buildAbsoluteUrl } from './utils'
import type { PublicSeoSettings } from './settings'

export type EndpointProbe = {
  url: string
  httpStatus: number | null
  available: boolean
}

export type SeoAdminSnapshot = {
  origin: string
  siteSettingsHref: string
  robots: EndpointProbe & { policy: 'allow' | 'disallow'; excerpt: string }
  sitemap: EndpointProbe & { indexLocs: string[] }
  feed: EndpointProbe
  developmentCrawlBlocked: boolean
  schemaAdapters: string[]
  registry: Array<{ resourceType: ResourceType; canonical: number; redirect: number }>
  publicationDelay: 'not-configured'
  settings: PublicSeoSettings
  homeFallbackTitle: string
  homeFallbackDescription: string
  logoConfigured: boolean
}

const RESOURCE_TYPES: ResourceType[] = ['post', 'page', 'category', 'tag']

async function probe(url: string, fetchImpl: typeof fetch, marker: string): Promise<EndpointProbe & { excerpt: string }> {
  try {
    const response = await fetchImpl(url, { method: 'GET', redirect: 'manual', cache: 'no-store' })
    const excerpt = (await response.text()).slice(0, 280)
    return {
      url,
      httpStatus: response.status,
      available: response.ok && excerpt.includes(marker),
      excerpt,
    }
  } catch {
    return { url, httpStatus: null, available: false, excerpt: '' }
  }
}

async function registryCount(payload: Payload, resourceType: ResourceType, recordRole: 'canonical' | 'redirect'): Promise<number> {
  const result = await payload.find({
    collection: 'url-registry',
    where: {
      and: [{ recordRole: { equals: recordRole } }, { resourceType: { equals: resourceType } }],
    },
    depth: 0,
    limit: 1,
    page: 1,
    pagination: true,
    overrideAccess: true,
  })
  return typeof result.totalDocs === 'number' ? result.totalDocs : 0
}

export async function loadSeoAdminSnapshot(
  payload: Payload,
  options?: { fetchImpl?: typeof fetch; environment?: string; adminRoute?: string },
): Promise<SeoAdminSnapshot> {
  const fetchImpl = options?.fetchImpl || fetch
  const environment = options?.environment || process.env.NODE_ENV || 'development'
  const site = await loadPublicSiteSettings(payload)
  const home = await resolveSeoPageContext(payload, '/')
  const robotsText = buildRobotsTxt(site.siteUrl, environment)
  const sitemap = await buildSitemapIndex(payload).catch(() => ({ xml: '', entries: [] }))
  const origin = site.siteUrl

  const [robotsProbe, sitemapProbe, feedProbe] = await Promise.all([
    probe(buildAbsoluteUrl(origin, '/robots.txt'), fetchImpl, 'Sitemap:'),
    probe(buildAbsoluteUrl(origin, '/sitemap.xml'), fetchImpl, '<sitemapindex'),
    probe(buildAbsoluteUrl(origin, '/feed'), fetchImpl, '<rss'),
  ])

  const registry = await Promise.all(
    RESOURCE_TYPES.map(async (resourceType) => ({
      resourceType,
      canonical: await registryCount(payload, resourceType, 'canonical'),
      redirect: await registryCount(payload, resourceType, 'redirect'),
    })),
  )

  return {
    origin,
    siteSettingsHref: `${options?.adminRoute || '/admin'}/globals/settings`,
    robots: {
      ...robotsProbe,
      policy: environment === 'production' ? 'allow' : 'disallow',
      excerpt: robotsText,
    },
    sitemap: {
      url: sitemapProbe.url,
      httpStatus: sitemapProbe.httpStatus,
      available: sitemapProbe.available,
      indexLocs: sitemap.entries.map((entry) => entry.loc),
    },
    feed: {
      url: feedProbe.url,
      httpStatus: feedProbe.httpStatus,
      available: feedProbe.available,
    },
    developmentCrawlBlocked: environment !== 'production',
    schemaAdapters: ['Organization or Person', 'WebSite', 'WebPage', 'BreadcrumbList', 'Article'],
    registry,
    publicationDelay: 'not-configured',
    settings: {
      homeTitle: home.site.homeTitle || '',
      homeDescription: home.site.homeDescription || '',
      publisherType: home.site.publisherType === 'Person' ? 'Person' : 'Organization',
      publisherName: home.site.publisherName || '',
      sameAs: home.site.sameAs || [],
    },
    homeFallbackTitle: home.homeFallbackTitle || home.title,
    homeFallbackDescription: home.homeFallbackDescription || home.description,
    logoConfigured: Boolean(home.site.logo?.url),
  }
}
