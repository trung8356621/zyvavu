import type { Payload } from 'payload'

import {
  buildResourceSitemap,
  buildSitemapIndex,
  sitemapChunkPath,
  SITEMAP_GROUPS,
  type SitemapGroup,
  type SitemapUrlEntry,
} from './sitemap'

export const SITEMAP_GROUP_LABELS: Record<SitemapGroup, string> = {
  posts: 'Bài viết',
  pages: 'Trang',
  categories: 'Chuyên mục',
  tags: 'Thẻ',
}

export type SitemapIndexRow = {
  group: SitemapGroup
  label: string
  page: number
  urlCount: number
  lastmod?: string
  xmlPath: string
  viewPath: string
}

export type SitemapChunkView = {
  group: SitemapGroup
  label: string
  page: number
  pageCount: number
  entries: SitemapUrlEntry[]
  xmlPath: string
}

function latestLastmod(entries: SitemapUrlEntry[]): string | undefined {
  const dates = entries.map((entry) => entry.lastmod).filter((value): value is string => Boolean(value))
  if (dates.length === 0) return undefined
  return dates.sort().at(-1)
}

export function sitemapViewPath(group: SitemapGroup, page: number): string {
  return `/sitemap-view/${group}/${page}`
}

export async function loadSitemapIndexView(
  payload: Payload,
  options?: { chunkSize?: number },
): Promise<SitemapIndexRow[]> {
  const index = await buildSitemapIndex(payload, options)
  const rows: SitemapIndexRow[] = []
  for (const entry of index.entries) {
    const chunk = await buildResourceSitemap(payload, entry.group, entry.page, options)
    rows.push({
      group: entry.group,
      label: SITEMAP_GROUP_LABELS[entry.group],
      page: entry.page,
      urlCount: chunk?.entries.length ?? 0,
      lastmod: chunk ? latestLastmod(chunk.entries) : undefined,
      xmlPath: sitemapChunkPath(entry.group, entry.page),
      viewPath: sitemapViewPath(entry.group, entry.page),
    })
  }
  return rows
}

export function isSitemapGroup(group: string): group is SitemapGroup {
  return SITEMAP_GROUPS.some((item) => item.group === group)
}

export async function loadSitemapChunkView(
  payload: Payload,
  group: string,
  page: number,
  options?: { chunkSize?: number },
): Promise<SitemapChunkView | null> {
  if (!isSitemapGroup(group)) return null
  const chunk = await buildResourceSitemap(payload, group, page, options)
  if (!chunk) return null
  return {
    group,
    label: SITEMAP_GROUP_LABELS[group],
    page,
    pageCount: chunk.pageCount,
    entries: chunk.entries,
    xmlPath: sitemapChunkPath(group, page),
  }
}
