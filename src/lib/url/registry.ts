import { APIError, type CollectionAfterReadHook, type CollectionSlug, type Payload, type PayloadRequest } from 'payload'

import {
  DEFAULT_CATEGORY_PERMALINK_STRUCTURE,
  DEFAULT_PAGE_PERMALINK_STRUCTURE,
  DEFAULT_POST_PERMALINK_STRUCTURE,
  DEFAULT_TAG_PERMALINK_STRUCTURE,
  extractSlugAndPattern,
  normalizePermalinkPattern,
  type PermalinkResourceType,
  resolveEstablishedOrPattern,
  resolveResourcePath,
} from '@/lib/permalinks'
import { type ResourceType } from './paths'
import { isReservedPath, normalizePath } from './normalize'

export type ResourceDoc = {
  id: number
  slug?: string | null
  publicPath?: string | null
  canonicalPath?: string | null
  _status?: string | null
  visibility?: string | null
}

export type ResourceTypeConfig = {
  resourceType: ResourceType
  collection: CollectionSlug
  relationField: 'page' | 'post' | 'category' | 'tag'
  permalinkResource: PermalinkResourceType
  settingsField:
    | 'pagePermalinkStructure'
    | 'postPermalinkStructure'
    | 'categoryPermalinkStructure'
    | 'tagPermalinkStructure'
  defaultStructure: string
  token: string
  hasDrafts: boolean
  isPublic: (doc: ResourceDoc) => boolean
}

export const RESOURCE_TYPE_MAP: Record<ResourceType, ResourceTypeConfig> = {
  page: {
    resourceType: 'page',
    collection: 'pages',
    relationField: 'page',
    permalinkResource: 'pages',
    settingsField: 'pagePermalinkStructure',
    defaultStructure: DEFAULT_PAGE_PERMALINK_STRUCTURE,
    token: '%slug%',
    hasDrafts: true,
    isPublic: (doc) => doc._status === 'published' && doc.visibility === 'public' && Boolean(doc.slug),
  },
  post: {
    resourceType: 'post',
    collection: 'posts',
    relationField: 'post',
    permalinkResource: 'posts',
    settingsField: 'postPermalinkStructure',
    defaultStructure: DEFAULT_POST_PERMALINK_STRUCTURE,
    token: '%postname%',
    hasDrafts: true,
    isPublic: (doc) => doc._status === 'published' && Boolean(doc.slug),
  },
  category: {
    resourceType: 'category',
    collection: 'categories',
    relationField: 'category',
    permalinkResource: 'categories',
    settingsField: 'categoryPermalinkStructure',
    defaultStructure: DEFAULT_CATEGORY_PERMALINK_STRUCTURE,
    token: '%term%',
    hasDrafts: false,
    isPublic: (doc) => Boolean(doc.slug),
  },
  tag: {
    resourceType: 'tag',
    collection: 'tags',
    relationField: 'tag',
    permalinkResource: 'tags',
    settingsField: 'tagPermalinkStructure',
    defaultStructure: DEFAULT_TAG_PERMALINK_STRUCTURE,
    token: '%term%',
    hasDrafts: false,
    isPublic: (doc) => Boolean(doc.slug),
  },
}

async function getSiteDefaultStructure(
  payload: Payload,
  resourceType: ResourceType,
  req?: PayloadRequest,
): Promise<string> {
  const cfg = RESOURCE_TYPE_MAP[resourceType]
  try {
    const settings = await payload.findGlobal({ slug: 'settings', overrideAccess: true, req })
    const raw = settings?.[cfg.settingsField]
    return normalizePermalinkPattern(raw, cfg.permalinkResource)
  } catch {
    return cfg.defaultStructure
  }
}

type RouteDoc = {
  id: number
  path: string
  recordRole: 'canonical' | 'redirect'
  resourceType: ResourceType
  page?: number | { id: number } | null
  post?: number | { id: number } | null
  category?: number | { id: number } | null
  tag?: number | { id: number } | null
  targetPath?: string | null
}

export type ResolvedRoute =
  | { kind: 'canonical'; resourceType: ResourceType; id: number }
  | { kind: 'redirect'; target: string }

export function detectRedirectLoop(origin: string, target: string, redirects: Map<string, string>): boolean {
  const seen = new Set<string>()
  let current = target
  while (redirects.has(current)) {
    if (current === origin || seen.has(current)) return true
    seen.add(current)
    const next = redirects.get(current)
    if (!next) return false
    if (next === origin) return true
    current = next
  }
  return current === origin
}

export function isPublicResource(resourceType: ResourceType, doc: ResourceDoc): boolean {
  const cfg = RESOURCE_TYPE_MAP[resourceType]
  if (!cfg) return false
  return cfg.isPublic(doc)
}

function isUniqueViolation(error: unknown): boolean {
  const seen = new Set<unknown>()
  let current: unknown = error
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current)
    if ('code' in current && (current as { code?: string }).code === '23505') return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}

function whereForResource(resourceType: ResourceType, id: number): Record<string, unknown> {
  const field = RESOURCE_TYPE_MAP[resourceType].relationField
  return { [field]: { equals: id } }
}

function buildRelationData(resourceType: ResourceType, id: number): Record<string, number | null> {
  return {
    page: resourceType === 'page' ? id : null,
    post: resourceType === 'post' ? id : null,
    category: resourceType === 'category' ? id : null,
    tag: resourceType === 'tag' ? id : null,
  }
}

function extractRouteResourceId(route: RouteDoc): number | null {
  const cfg = RESOURCE_TYPE_MAP[route.resourceType]
  if (!cfg) return null
  const raw = route[cfg.relationField]
  if (typeof raw === 'number') return raw
  if (raw && typeof raw === 'object' && typeof raw.id === 'number') return raw.id
  return null
}

async function findRoutes(
  payload: Payload,
  req: PayloadRequest | undefined,
  where: Record<string, unknown>,
): Promise<RouteDoc[]> {
  const result = await payload.find({
    collection: 'url-registry',
    where: where as never,
    depth: 0,
    limit: 1000,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return result.docs as RouteDoc[]
}

export async function removeResourceRoutes(
  req: PayloadRequest,
  resourceType: ResourceType,
  id: number,
): Promise<void> {
  await req.payload.delete({
    collection: 'url-registry',
    where: whereForResource(resourceType, id) as never,
    overrideAccess: true,
    req,
  })
}

async function liveDocument(
  req: PayloadRequest,
  resourceType: ResourceType,
  doc: ResourceDoc,
): Promise<ResourceDoc | null> {
  if (isPublicResource(resourceType, doc)) return doc
  const cfg = RESOURCE_TYPE_MAP[resourceType]
  if (!cfg.hasDrafts) return null

  const prevSkip = req.context?.skipCanonicalLookup
  if (req.context) req.context.skipCanonicalLookup = true
  try {
    const loaded = await req.payload.findByID({
      collection: cfg.collection,
      id: doc.id,
      depth: 0,
      draft: false,
      overrideAccess: true,
      disableErrors: true,
      req,
    })
    const live = loaded as ResourceDoc | null
    if (!live || !isPublicResource(resourceType, live)) return null
    return live
  } finally {
    if (req.context) req.context.skipCanonicalLookup = prevSkip
  }
}

async function pointRedirectsAt(
  req: PayloadRequest,
  owned: RouteDoc[],
  nextPath: string,
  skipIds: number[],
): Promise<void> {
  for (const route of owned) {
    if (skipIds.includes(route.id) || route.recordRole !== 'redirect' || route.targetPath === nextPath) continue
    await req.payload.update({
      collection: 'url-registry',
      id: route.id,
      overrideAccess: true,
      req,
      data: { targetPath: nextPath },
    })
  }
}

export async function computeNextCanonicalPath(
  payload: Payload,
  req: PayloadRequest | undefined,
  resourceType: ResourceType,
  live: ResourceDoc,
  canonical?: RouteDoc,
  previousDoc?: ResourceDoc | null,
): Promise<string> {
  const cfg = RESOURCE_TYPE_MAP[resourceType]
  if (resourceType === 'page' && live.slug === 'home') {
    return '/'
  }
  if (typeof live.publicPath === 'string' && live.publicPath.trim()) {
    return normalizePath(live.publicPath)
  }
  if (canonical) {
    const canonicalSlug =
      canonical.path === '/' && resourceType === 'page'
        ? 'home'
        : extractSlugAndPattern(canonical.path, cfg.token)?.slug
    const hadExplicitPublicPath =
      typeof previousDoc?.publicPath === 'string' && Boolean(previousDoc.publicPath.trim())

    if (canonicalSlug && canonicalSlug === live.slug && !hadExplicitPublicPath) {
      return canonical.path
    }

    const defaultStructure = await getSiteDefaultStructure(payload, resourceType, req)
    const oldSlug = canonicalSlug || previousDoc?.slug || null
    if (hadExplicitPublicPath && canonicalSlug !== previousDoc?.slug) {
      return resolveResourcePath(defaultStructure, live.slug as string, cfg.permalinkResource)
    }
    return resolveEstablishedOrPattern(
      canonical.path,
      oldSlug,
      live.slug as string,
      defaultStructure,
      cfg.permalinkResource,
    )
  }

  const defaultStructure = await getSiteDefaultStructure(payload, resourceType, req)
  return resolveResourcePath(defaultStructure, live.slug as string, cfg.permalinkResource)
}

export async function syncResourceRoute(
  req: PayloadRequest,
  resourceType: ResourceType,
  doc: ResourceDoc,
  previousDoc?: ResourceDoc | null,
): Promise<void> {
  const id = doc.id
  const live = await liveDocument(req, resourceType, doc)
  if (!live) {
    const owned = await findRoutes(req.payload, req, whereForResource(resourceType, id))
    const canonical = owned.find((route) => route.recordRole === 'canonical')
    if (canonical) {
      await req.payload.delete({
        collection: 'url-registry',
        id: canonical.id,
        overrideAccess: true,
        req,
      })
    }
    doc.canonicalPath = null
    return
  }

  const payload = req.payload
  const owned = await findRoutes(payload, req, whereForResource(resourceType, id))
  const canonical = owned.find((route) => route.recordRole === 'canonical')

  const nextPath = await computeNextCanonicalPath(payload, req, resourceType, live, canonical, previousDoc)

  if (isReservedPath(nextPath) || (resourceType === 'page' && nextPath.startsWith('/posts/'))) {
    throw new APIError('That public URL is reserved.', 409)
  }

  const occupant = (await findRoutes(payload, req, { path: { equals: nextPath } })).find(
    (route) => route.id !== canonical?.id,
  )

  if (occupant && !owned.some((route) => route.id === occupant.id)) {
    throw new APIError('That public URL is already in use.', 409)
  }

  if (canonical?.path === nextPath && !occupant) {
    await pointRedirectsAt(req, owned, nextPath, [])
    if (isPublicResource(resourceType, doc)) {
      doc.canonicalPath = nextPath
    }
    return
  }

  if (occupant && owned.some((route) => route.id === occupant.id)) {
    await payload.delete({
      collection: 'url-registry',
      id: occupant.id,
      overrideAccess: true,
      req,
    })
  }

  const redirects = await findRoutes(payload, req, { recordRole: { equals: 'redirect' } })
  const edges = new Map(
    redirects
      .filter((route) => route.targetPath && route.id !== occupant?.id)
      .map((route) => [route.path, route.targetPath as string]),
  )
  if (canonical && detectRedirectLoop(canonical.path, nextPath, edges)) {
    throw new APIError('That URL change would create a redirect loop.', 409)
  }

  const relation = buildRelationData(resourceType, id)
  const skipIds = occupant ? [occupant.id] : []

  try {
    if (canonical) {
      await payload.update({
        collection: 'url-registry',
        id: canonical.id,
        overrideAccess: true,
        req,
        data: { path: nextPath },
      })
      await pointRedirectsAt(req, owned, nextPath, [canonical.id, ...skipIds])
      await payload.create({
        collection: 'url-registry',
        overrideAccess: true,
        req,
        draft: false,
        data: {
          path: canonical.path,
          recordRole: 'redirect',
          resourceType,
          targetPath: nextPath,
          locale: null,
          siteKey: null,
          ...relation,
        },
      })
      if (isPublicResource(resourceType, doc)) {
        doc.canonicalPath = nextPath
      }
      return
    }

    await payload.create({
      collection: 'url-registry',
      overrideAccess: true,
      req,
      draft: false,
      data: {
        path: nextPath,
        recordRole: 'canonical',
        resourceType,
        targetPath: null,
        locale: null,
        siteKey: null,
        ...relation,
      },
    })
    await pointRedirectsAt(req, owned, nextPath, skipIds)
    if (isPublicResource(resourceType, doc)) {
      doc.canonicalPath = nextPath
    }
  } catch (error) {
    if (isUniqueViolation(error)) throw new APIError('That public URL is already in use.', 409)
    throw error
  }
}

export async function resolvePublicPath(payload: Payload, rawPath: string): Promise<ResolvedRoute | null> {
  let path: string
  try {
    path = normalizePath(rawPath)
  } catch {
    return null
  }
  if (isReservedPath(path)) return null

  const requested = path
  const seen = new Set<string>()
  for (let hop = 0; hop < 8; hop += 1) {
    if (seen.has(path)) return null
    seen.add(path)
    const result = await payload.find({
      collection: 'url-registry',
      where: { path: { equals: path } },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })
    const route = result.docs[0] as RouteDoc | undefined
    if (!route) return null
    if (route.recordRole === 'canonical') {
      const id = extractRouteResourceId(route)
      if (typeof id !== 'number') return null
      if (route.path !== requested) return { kind: 'redirect', target: route.path }
      return { kind: 'canonical', resourceType: route.resourceType, id }
    }
    if (!route.targetPath) return null
    path = route.targetPath
  }
  return null
}

export async function getCanonicalPath(
  payload: Payload,
  resourceType: ResourceType,
  id: number,
  req?: PayloadRequest,
): Promise<string | null> {
  const result = await payload.find({
    collection: 'url-registry',
    where: {
      and: [
        { recordRole: { equals: 'canonical' } },
        { resourceType: { equals: resourceType } },
        whereForResource(resourceType, id),
      ],
    } as never,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
  })
  const route = result.docs[0] as { path?: string } | undefined
  return route?.path || null
}

export async function getCanonicalPathsForResources(
  payload: Payload,
  resourceType: ResourceType,
  ids: number[],
  req?: PayloadRequest,
): Promise<Map<number, string>> {
  const map = new Map<number, string>()
  const uniqueIds = Array.from(new Set(ids.filter((id) => typeof id === 'number')))
  if (uniqueIds.length === 0) return map

  const field = RESOURCE_TYPE_MAP[resourceType].relationField
  const result = await payload.find({
    collection: 'url-registry',
    where: {
      and: [
        { recordRole: { equals: 'canonical' } },
        { resourceType: { equals: resourceType } },
        { [field]: { in: uniqueIds } },
      ],
    } as never,
    depth: 0,
    limit: uniqueIds.length,
    pagination: false,
    overrideAccess: true,
    req,
  })

  for (const doc of result.docs as RouteDoc[]) {
    const resId = extractRouteResourceId(doc)
    if (typeof resId === 'number' && doc.path) {
      map.set(resId, doc.path)
    }
  }
  return map
}

export async function attachCanonicalUrls<T extends { id?: number | string; canonicalPath?: string | null }>(
  payload: Payload,
  resourceType: ResourceType,
  docs: T[],
  req?: PayloadRequest,
): Promise<T[]> {
  if (!Array.isArray(docs) || docs.length === 0) return docs
  const ids = docs
    .map((d) => (typeof d?.id === 'number' ? d.id : Number(d?.id)))
    .filter((n) => Number.isFinite(n))
  const pathMap = await getCanonicalPathsForResources(payload, resourceType, ids, req)
  return docs.map((doc) => {
    const numId = typeof doc?.id === 'number' ? doc.id : Number(doc?.id)
    const resolved = pathMap.get(numId) || doc.canonicalPath || null
    return {
      ...doc,
      canonicalPath: resolved,
    }
  })
}

export function attachCanonicalPathHook(resourceType: ResourceType): CollectionAfterReadHook {
  return async ({ doc, req }) => {
    if (!doc || typeof doc !== 'object') return doc
    if (req?.context?.skipCanonicalLookup) return doc
    if (!isPublicResource(resourceType, doc as ResourceDoc) || typeof doc.id !== 'number') {
      doc.canonicalPath = null
      return doc
    }
    try {
      const cacheKey = `${resourceType}:${doc.id}`
      if (req?.context) {
        if (!req.context._canonicalCache) {
          req.context._canonicalCache = new Map<string, string | null>()
        }
        const cache = req.context._canonicalCache as Map<string, string | null>
        if (cache.has(cacheKey)) {
          doc.canonicalPath = cache.get(cacheKey) || null
          return doc
        }
      }

      const canonical = await getCanonicalPath(req.payload, resourceType, doc.id, req)
      const path =
        canonical || (await computeNextCanonicalPath(req.payload, req, resourceType, doc as ResourceDoc)) || null

      if (req?.context?._canonicalCache) {
        ;(req.context._canonicalCache as Map<string, string | null>).set(cacheKey, path)
      }
      doc.canonicalPath = path
    } catch {
      doc.canonicalPath = null
    }
    return doc
  }
}

export type RegistryDiscrepancyItem = {
  resourceType: ResourceType
  id: number
  slug: string
  currentCanonicalPath: string | null
  expectedPath: string
  reason: 'missing_canonical' | 'explicit_public_path_mismatch' | 'slug_mismatch'
}

export type RegistryConflictItem = {
  resourceType: ResourceType
  id: number
  slug: string
  desiredPath: string
  reason: string
}

export type RegistryRepairReport = {
  dryRun: boolean
  discrepancies: RegistryDiscrepancyItem[]
  repaired: RegistryDiscrepancyItem[]
  removedInvalidCanonicals: Array<{ routeId: number; path: string; resourceType: ResourceType }>
  conflicts: RegistryConflictItem[]
}

export async function inspectAndRepairUrlRegistry(
  payload: Payload,
  options?: { dryRun?: boolean },
): Promise<RegistryRepairReport> {
  const dryRun = options?.dryRun !== false
  const discrepancies: RegistryDiscrepancyItem[] = []
  const repaired: RegistryDiscrepancyItem[] = []
  const removedInvalidCanonicals: Array<{ routeId: number; path: string; resourceType: ResourceType }> = []
  const conflicts: RegistryConflictItem[] = []

  const allRoutesResult = await payload.find({
    collection: 'url-registry',
    depth: 0,
    limit: 5000,
    pagination: false,
    overrideAccess: true,
  })
  const allRoutes = allRoutesResult.docs as RouteDoc[]
  const pathToRoute = new Map<string, RouteDoc>(allRoutes.map((r) => [r.path, r]))
  const redirectEdges = new Map<string, string>(
    allRoutes
      .filter((r) => r.recordRole === 'redirect' && r.targetPath)
      .map((r) => [r.path, r.targetPath as string]),
  )

  const resourceTypes: ResourceType[] = ['page', 'post', 'category', 'tag']

  for (const resourceType of resourceTypes) {
    const cfg = RESOURCE_TYPE_MAP[resourceType]
    const defaultStructure = await getSiteDefaultStructure(payload, resourceType)

    const docsResult = await payload.find({
      collection: cfg.collection,
      depth: 0,
      limit: 2000,
      pagination: false,
      draft: false,
      overrideAccess: true,
      context: { skipCanonicalLookup: true },
    })
    const docs = docsResult.docs as ResourceDoc[]
    const docById = new Map<number, ResourceDoc>(docs.map((d) => [d.id, d]))

    // Check existing canonical routes for this resourceType that point to non-public or deleted docs
    const canonicalRoutesForType = allRoutes.filter(
      (r) => r.recordRole === 'canonical' && r.resourceType === resourceType,
    )
    for (const route of canonicalRoutesForType) {
      const targetId = extractRouteResourceId(route)
      const doc = targetId != null ? docById.get(targetId) : undefined
      if (!doc || !isPublicResource(resourceType, doc)) {
        removedInvalidCanonicals.push({
          routeId: route.id,
          path: route.path,
          resourceType,
        })
        if (!dryRun) {
          await payload.delete({
            collection: 'url-registry',
            id: route.id,
            overrideAccess: true,
          })
          pathToRoute.delete(route.path)
        }
      }
    }

    // Check public docs for missing or broken canonical routes
    for (const doc of docs) {
      if (!isPublicResource(resourceType, doc) || !doc.slug) continue

      const owned = allRoutes.filter(
        (r) => r.resourceType === resourceType && extractRouteResourceId(r) === doc.id,
      )
      const canonical = owned.find((r) => r.recordRole === 'canonical')

      let expectedPath: string
      let reason: RegistryDiscrepancyItem['reason'] | null = null

      if (!canonical) {
        if (resourceType === 'page' && doc.slug === 'home') {
          expectedPath = '/'
        } else if (typeof doc.publicPath === 'string' && doc.publicPath.trim()) {
          expectedPath = normalizePath(doc.publicPath)
        } else {
          expectedPath = resolveResourcePath(defaultStructure, doc.slug, cfg.permalinkResource)
        }
        reason = 'missing_canonical'
      } else if (typeof doc.publicPath === 'string' && doc.publicPath.trim()) {
        const normalizedExplicit = normalizePath(doc.publicPath)
        if (canonical.path !== normalizedExplicit) {
          expectedPath = normalizedExplicit
          reason = 'explicit_public_path_mismatch'
        } else {
          continue
        }
      } else if (resourceType === 'page' && doc.slug === 'home') {
        if (canonical.path !== '/') {
          expectedPath = '/'
          reason = 'slug_mismatch'
        } else {
          continue
        }
      } else {
        const canonicalSlug = extractSlugAndPattern(canonical.path, cfg.token)?.slug
        if (canonicalSlug === doc.slug) {
          // Existing valid canonical URL — preserve unchanged!
          continue
        }
        expectedPath = resolveEstablishedOrPattern(
          canonical.path,
          canonicalSlug,
          doc.slug,
          defaultStructure,
          cfg.permalinkResource,
        )
        if (expectedPath === canonical.path) continue
        reason = 'slug_mismatch'
      }

      const item: RegistryDiscrepancyItem = {
        resourceType,
        id: doc.id,
        slug: doc.slug,
        currentCanonicalPath: canonical?.path ?? null,
        expectedPath,
        reason,
      }
      discrepancies.push(item)

      if (isReservedPath(expectedPath) || (resourceType === 'page' && expectedPath.startsWith('/posts/'))) {
        conflicts.push({
          resourceType,
          id: doc.id,
          slug: doc.slug,
          desiredPath: expectedPath,
          reason: 'Desired path is reserved.',
        })
        continue
      }

      const occupant = pathToRoute.get(expectedPath)
      if (occupant && occupant.id !== canonical?.id && !owned.some((r) => r.id === occupant.id)) {
        conflicts.push({
          resourceType,
          id: doc.id,
          slug: doc.slug,
          desiredPath: expectedPath,
          reason: `Path '${expectedPath}' is already occupied by route #${occupant.id} (${occupant.resourceType}, ${occupant.recordRole}).`,
        })
        continue
      }

      if (canonical && detectRedirectLoop(canonical.path, expectedPath, redirectEdges)) {
        conflicts.push({
          resourceType,
          id: doc.id,
          slug: doc.slug,
          desiredPath: expectedPath,
          reason: `Changing '${canonical.path}' to '${expectedPath}' would create a redirect loop.`,
        })
        continue
      }

      if (!dryRun) {
        const relation = buildRelationData(resourceType, doc.id)
        if (occupant && owned.some((r) => r.id === occupant.id) && occupant.id !== canonical?.id) {
          await payload.delete({
            collection: 'url-registry',
            id: occupant.id,
            overrideAccess: true,
          })
          pathToRoute.delete(occupant.path)
          redirectEdges.delete(occupant.path)
        }

        if (canonical) {
          const oldPath = canonical.path
          await payload.update({
            collection: 'url-registry',
            id: canonical.id,
            overrideAccess: true,
            data: { path: expectedPath },
          })
          pathToRoute.delete(oldPath)
          canonical.path = expectedPath
          pathToRoute.set(expectedPath, canonical)

          for (const r of owned) {
            if (r.recordRole === 'redirect' && r.id !== occupant?.id && r.targetPath !== expectedPath) {
              await payload.update({
                collection: 'url-registry',
                id: r.id,
                overrideAccess: true,
                data: { targetPath: expectedPath },
              })
              r.targetPath = expectedPath
              redirectEdges.set(r.path, expectedPath)
            }
          }

          const createdRedirect = (await payload.create({
            collection: 'url-registry',
            overrideAccess: true,
            draft: false,
            data: {
              path: oldPath,
              recordRole: 'redirect',
              resourceType,
              targetPath: expectedPath,
              locale: null,
              siteKey: null,
              ...relation,
            },
          })) as unknown as RouteDoc
          pathToRoute.set(oldPath, createdRedirect)
          redirectEdges.set(oldPath, expectedPath)
        } else {
          const createdCanonical = (await payload.create({
            collection: 'url-registry',
            overrideAccess: true,
            draft: false,
            data: {
              path: expectedPath,
              recordRole: 'canonical',
              resourceType,
              targetPath: null,
              locale: null,
              siteKey: null,
              ...relation,
            },
          })) as unknown as RouteDoc
          pathToRoute.set(expectedPath, createdCanonical)

          for (const r of owned) {
            if (r.recordRole === 'redirect' && r.id !== occupant?.id && r.targetPath !== expectedPath) {
              await payload.update({
                collection: 'url-registry',
                id: r.id,
                overrideAccess: true,
                data: { targetPath: expectedPath },
              })
              r.targetPath = expectedPath
              redirectEdges.set(r.path, expectedPath)
            }
          }
        }
        repaired.push(item)
      }
    }
  }

  return {
    dryRun,
    discrepancies,
    repaired,
    removedInvalidCanonicals,
    conflicts,
  }
}
