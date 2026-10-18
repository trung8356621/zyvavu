import type { Payload } from 'payload'

import { loadPublicSiteSettings } from '@/lib/site/settings'
import { RESOURCE_TYPE_MAP, type ResourceDoc } from '@/lib/url/registry'
import type { ResourceType } from '@/lib/url/paths'

import { decideIndexability, isEligibleForSitemap, type IndexabilityDocument } from './indexability'
import { buildAbsoluteUrl, escapeXml, toValidIsoDate } from './utils'

export const SITEMAP_CHUNK_SIZE = 1000

export const SITEMAP_GROUPS = [
  { group: 'posts', resourceType: 'post' },
  { group: 'pages', resourceType: 'page' },
  { group: 'categories', resourceType: 'category' },
  { group: 'tags', resourceType: 'tag' },
] as const

export type SitemapGroup = (typeof SITEMAP_GROUPS)[number]['group']

export type SitemapUrlEntry = {
  loc: string
  lastmod?: string
}

export type SitemapIndexEntry = {
  group: SitemapGroup
  page: number
  loc: string
}

type RegistryRow = {
  id?: number
  path?: string | null
  recordRole?: 'canonical' | 'redirect' | null
  resourceType?: ResourceType | null
  page?: number | { id: number } | null
  post?: number | { id: number } | null
  category?: number | { id: number } | null
  tag?: number | { id: number } | null
}

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>'
const SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'

function groupResourceType(group: string): ResourceType | null {
  const match = SITEMAP_GROUPS.find((item) => item.group === group)
  return match ? match.resourceType : null
}

export function sitemapChunkPath(group: SitemapGroup, page: number): string {
  return `/sitemap/${group}/${page}.xml`
}

export function renderSitemapIndex(entries: SitemapIndexEntry[]): string {
  const body = entries
    .map((entry) => `  <sitemap>\n    <loc>${escapeXml(entry.loc)}</loc>\n  </sitemap>`)
    .join('\n')
  return `${XML_HEADER}\n<sitemapindex xmlns="${SITEMAP_NS}">\n${body}${body ? '\n' : ''}</sitemapindex>\n`
}

export function renderUrlSet(entries: SitemapUrlEntry[]): string {
  const body = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : ''
      return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmod}\n  </url>`
    })
    .join('\n')
  return `${XML_HEADER}\n<urlset xmlns="${SITEMAP_NS}">\n${body}${body ? '\n' : ''}</urlset>\n`
}

function canonicalWhere(resourceType: ResourceType): Record<string, unknown> {
  return {
    and: [{ recordRole: { equals: 'canonical' } }, { resourceType: { equals: resourceType } }],
  }
}

function relationId(value: RegistryRow[ResourceType] | undefined): number | null {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && typeof value.id === 'number') return value.id
  return null
}

function chunkSizeOf(chunkSize?: number): number {
  if (!chunkSize || !Number.isInteger(chunkSize) || chunkSize < 1) return SITEMAP_CHUNK_SIZE
  return chunkSize
}

async function canonicalPageCount(payload: Payload, resourceType: ResourceType, chunkSize: number): Promise<number> {
  const probe = await payload.find({
    collection: 'url-registry',
    where: canonicalWhere(resourceType) as never,
    depth: 0,
    limit: 1,
    page: 1,
    pagination: true,
    overrideAccess: true,
  })
  const total = typeof probe.totalDocs === 'number' ? probe.totalDocs : 0
  // Keep the first chunk addressable on a newly installed, empty site.
  if (total <= 0) return 1
  return Math.ceil(total / chunkSize)
}

function lastmodOf(doc: Record<string, unknown>): string | undefined {
  return toValidIsoDate(doc.updatedAt) || toValidIsoDate(doc.createdAt)
}

export async function buildSitemapIndex(
  payload: Payload,
  options?: { chunkSize?: number },
): Promise<{ xml: string; entries: SitemapIndexEntry[] }> {
  const settings = await loadPublicSiteSettings(payload)
  const chunkSize = chunkSizeOf(options?.chunkSize)
  const entries: SitemapIndexEntry[] = []

  for (const item of SITEMAP_GROUPS) {
    const pages = await canonicalPageCount(payload, item.resourceType, chunkSize)
    for (let page = 1; page <= pages; page += 1) {
      const path = sitemapChunkPath(item.group, page)
      entries.push({
        group: item.group,
        page,
        loc: buildAbsoluteUrl(settings.siteUrl, path),
      })
    }
  }

  return { xml: renderSitemapIndex(entries), entries }
}

export async function buildResourceSitemap(
  payload: Payload,
  group: string,
  page: number,
  options?: { chunkSize?: number },
): Promise<{ xml: string; entries: SitemapUrlEntry[]; locs: string[]; pageCount: number } | null> {
  const resourceType = groupResourceType(group)
  if (!resourceType || !Number.isInteger(page) || page < 1) return null

  const chunkSize = chunkSizeOf(options?.chunkSize)
  const pageCount = await canonicalPageCount(payload, resourceType, chunkSize)
  if (page > pageCount) return null

  const settings = await loadPublicSiteSettings(payload)
  const routes = await payload.find({
    collection: 'url-registry',
    where: canonicalWhere(resourceType) as never,
    depth: 0,
    limit: chunkSize,
    page,
    sort: 'id',
    pagination: true,
    overrideAccess: true,
  })

  const rows = (routes.docs || []) as RegistryRow[]
  const field = RESOURCE_TYPE_MAP[resourceType].relationField
  const ids = rows
    .map((row) => relationId(row[field]))
    .filter((id): id is number => typeof id === 'number')

  const docsById = new Map<number, IndexabilityDocument & Record<string, unknown>>()
  if (ids.length > 0) {
    const docs = await payload.find({
      collection: RESOURCE_TYPE_MAP[resourceType].collection,
      where: { id: { in: ids } } as never,
      depth: 0,
      limit: ids.length,
      pagination: false,
      draft: false,
      overrideAccess: true,
    })
    for (const doc of docs.docs as unknown as Array<ResourceDoc & Record<string, unknown>>) {
      if (typeof doc.id === 'number') docsById.set(doc.id, doc)
    }
  }

  const entries: SitemapUrlEntry[] = []
  for (const row of rows) {
    if (row.recordRole !== 'canonical' || !row.path) continue
    const id = relationId(row[field])
    const doc = typeof id === 'number' ? docsById.get(id) : undefined
    const decision = decideIndexability({
      status: doc ? 'ok' : 'not_found',
      resourceType,
      doc: doc || null,
      canonicalPath: row.path,
      recordRole: 'canonical',
    })
    if (!isEligibleForSitemap(decision)) continue
    const lastmod = doc ? lastmodOf(doc) : undefined
    entries.push({
      loc: buildAbsoluteUrl(settings.siteUrl, row.path),
      ...(lastmod ? { lastmod } : {}),
    })
  }

  return {
    xml: renderUrlSet(entries),
    entries,
    locs: entries.map((entry) => entry.loc),
    pageCount,
  }
}

export function parseSitemapChunkParam(group: string, pageParam: string): { group: SitemapGroup; page: number } | null {
  const resourceType = groupResourceType(group)
  const match = /^([1-9]\d*)\.xml$/.exec(pageParam)
  if (!resourceType || !match) return null
  return { group: group as SitemapGroup, page: Number(match[1]) }
}
