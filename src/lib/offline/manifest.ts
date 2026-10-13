import { createHash } from 'node:crypto'

import type { Payload } from 'payload'

import { linkedPageIds } from '@/lib/url/menu-membership'

export type OfflinePage = {
  id: string
  path: string
  updatedAt: string
}

export type OfflineManifest = {
  version: string
  limit: number
  enabled: boolean
  pages: OfflinePage[]
}

type PageRow = {
  id: string | number
  updatedAt?: string | null
  visibility?: string | null
  _status?: string | null
}

export function selectEligiblePages(
  pages: PageRow[],
  linkedIds: ReadonlySet<string>,
  canonicalPaths: ReadonlyMap<string, string>,
  limit: number,
): OfflinePage[] {
  const eligible = pages
    .filter((page) => page._status === 'published' && page.visibility === 'public' && linkedIds.has(String(page.id)))
    .map((page) => {
      const path = canonicalPaths.get(String(page.id))
      if (!path) return null
      return {
        id: String(page.id),
        path,
        updatedAt: page.updatedAt || '',
      }
    })
    .filter((page): page is OfflinePage => Boolean(page))
    .sort((a, b) => a.path.localeCompare(b.path))

  return eligible.slice(0, Math.max(1, limit))
}

export async function buildOfflineManifest(payload: Payload): Promise<OfflineManifest> {
  const settings = await payload.findGlobal({ slug: 'settings', overrideAccess: true })
  const limit = Number(settings.offlinePageLimit || 20)
  const enabled = settings.pwaEnabled !== false

  if (!enabled) {
    return { version: 'disabled', limit, enabled: false, pages: [] }
  }

  const menus = await payload.find({
    collection: 'menus',
    depth: 0,
    limit: 200,
    overrideAccess: true,
    pagination: false,
  })
  const linked = linkedPageIds(menus.docs)

  const pages = await payload.find({
    collection: 'pages',
    where: {
      and: [{ _status: { equals: 'published' } }, { visibility: { equals: 'public' } }],
    },
    depth: 0,
    limit: 500,
    overrideAccess: true,
    pagination: false,
  })

  const routes = await payload.find({
    collection: 'url-registry',
    where: {
      and: [{ recordRole: { equals: 'canonical' } }, { resourceType: { equals: 'page' } }],
    },
    depth: 0,
    limit: 500,
    overrideAccess: true,
    pagination: false,
  })
  const canonicalPaths = new Map<string, string>()
  for (const route of routes.docs) {
    const pageId = typeof route.page === 'number' ? String(route.page) : null
    if (pageId && route.path) canonicalPaths.set(pageId, route.path)
  }

  const selected = selectEligiblePages(pages.docs, linked, canonicalPaths, limit)
  const version = createHash('sha256')
    .update(selected.map((page) => `${page.id}:${page.path}:${page.updatedAt}`).join('|') || 'empty')
    .digest('hex')
    .slice(0, 16)

  return { version, limit, enabled: true, pages: selected }
}
