import { createHash } from 'node:crypto'

import type { Payload } from 'payload'

import { pathForPageSlug } from '@/lib/slug'

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
  slug?: string | null
  updatedAt?: string | null
  visibility?: string | null
  _status?: string | null
}

type RegistryRow = {
  kind?: string | null
  page?: string | number | { id?: string | number } | null
  post?: string | number | { id?: string | number } | null
}

function pageId(value: RegistryRow['page']): string | undefined {
  if (value == null) return undefined
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value.id == null) return undefined
  return String(value.id)
}

export function selectEligiblePages(pages: PageRow[], registry: RegistryRow[], limit: number): OfflinePage[] {
  const linked = new Set(
    registry.filter((row) => row.kind === 'page').map((row) => pageId(row.page)).filter((id): id is string => Boolean(id)),
  )

  const eligible = pages
    .filter((page) => page._status === 'published' && page.visibility === 'public' && page.slug && linked.has(String(page.id)))
    .map((page) => ({
      id: String(page.id),
      path: pathForPageSlug(page.slug as string),
      updatedAt: page.updatedAt || '',
    }))
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

  const registry = await payload.find({
    collection: 'url-registry',
    where: { kind: { equals: 'page' } },
    depth: 0,
    limit: 500,
    overrideAccess: true,
    pagination: false,
  })

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

  const selected = selectEligiblePages(pages.docs, registry.docs, limit)
  const version = createHash('sha256')
    .update(selected.map((page) => `${page.id}:${page.path}:${page.updatedAt}`).join('|') || 'empty')
    .digest('hex')
    .slice(0, 16)

  return { version, limit, enabled: true, pages: selected }
}
