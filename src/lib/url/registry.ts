import { APIError, type Payload, type PayloadRequest } from 'payload'

import {
  DEFAULT_PAGE_PERMALINK_STRUCTURE,
  DEFAULT_POST_PERMALINK_STRUCTURE,
  extractSlugAndPattern,
  normalizePermalinkPattern,
  resolveEstablishedOrPattern,
  resolvePagePath,
  resolvePostPath,
} from '@/lib/permalinks'
import { canonicalPathFor, type ResourceType } from './paths'
import { isReservedPath, normalizePath } from './normalize'

async function getSiteDefaultPostStructure(req: PayloadRequest): Promise<string> {
  try {
    const settings = await req.payload.findGlobal({ slug: 'settings', overrideAccess: true, req })
    return normalizePermalinkPattern(settings?.postPermalinkStructure as string, 'posts')
  } catch {
    return DEFAULT_POST_PERMALINK_STRUCTURE
  }
}

async function getSiteDefaultPageStructure(req: PayloadRequest): Promise<string> {
  try {
    const settings = await req.payload.findGlobal({ slug: 'settings', overrideAccess: true, req })
    return normalizePermalinkPattern(settings?.pagePermalinkStructure as string, 'pages')
  } catch {
    return DEFAULT_PAGE_PERMALINK_STRUCTURE
  }
}

type RouteDoc = {
  id: number
  path: string
  recordRole: 'canonical' | 'redirect'
  resourceType: ResourceType
  page?: number | null
  post?: number | null
  targetPath?: string | null
}

type ResourceDoc = {
  id: number
  slug?: string | null
  publicPath?: string | null
  _status?: string | null
  visibility?: string | null
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

function isPublic(resourceType: ResourceType, doc: ResourceDoc): boolean {
  if (doc._status !== 'published' || !doc.slug) return false
  if (resourceType === 'page') return doc.visibility === 'public'
  return true
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

async function findRoutes(
  payload: Payload,
  req: PayloadRequest,
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
    where: resourceType === 'page' ? { page: { equals: id } } : { post: { equals: id } },
    overrideAccess: true,
    req,
  })
}

async function liveDocument(
  req: PayloadRequest,
  resourceType: ResourceType,
  doc: ResourceDoc,
): Promise<ResourceDoc | null> {
  if (isPublic(resourceType, doc)) return doc
  const loaded = await req.payload.findByID({
    collection: resourceType === 'page' ? 'pages' : 'posts',
    id: doc.id,
    depth: 0,
    draft: false,
    overrideAccess: true,
    disableErrors: true,
    req,
  })
  const live = loaded as ResourceDoc | null
  if (!live || !isPublic(resourceType, live)) return null
  return live
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

export async function syncResourceRoute(
  req: PayloadRequest,
  resourceType: ResourceType,
  doc: ResourceDoc,
  previousDoc?: ResourceDoc | null,
): Promise<void> {
  const id = doc.id
  const live = await liveDocument(req, resourceType, doc)
  if (!live) {
    const owned = await findRoutes(
      req.payload,
      req,
      resourceType === 'page' ? { page: { equals: id } } : { post: { equals: id } },
    )
    const canonical = owned.find((route) => route.recordRole === 'canonical')
    if (canonical) {
      await req.payload.delete({
        collection: 'url-registry',
        id: canonical.id,
        overrideAccess: true,
        req,
      })
    }
    return
  }

  const payload = req.payload
  const owned = await findRoutes(payload, req, resourceType === 'page' ? { page: { equals: id } } : { post: { equals: id } })
  const canonical = owned.find((route) => route.recordRole === 'canonical')

  let nextPath: string
  if (resourceType === 'page') {
    if (live.slug === 'home') {
      nextPath = '/'
    } else if (typeof live.publicPath === 'string' && live.publicPath.trim()) {
      nextPath = normalizePath(live.publicPath)
    } else if (canonical) {
      const oldSlug = previousDoc?.slug || extractSlugAndPattern(canonical.path, '%slug%')?.slug
      if (!oldSlug || oldSlug === live.slug) {
        nextPath = canonical.path
      } else {
        const defaultStructure = await getSiteDefaultPageStructure(req)
        nextPath = resolveEstablishedOrPattern(canonical.path, oldSlug, live.slug as string, defaultStructure, 'pages')
      }
    } else {
      const defaultStructure = await getSiteDefaultPageStructure(req)
      nextPath = resolvePagePath(defaultStructure, live.slug as string)
    }
  } else {
    // Post routing logic
    if (typeof live.publicPath === 'string' && live.publicPath.trim()) {
      nextPath = normalizePath(live.publicPath)
    } else if (canonical) {
      const oldSlug = previousDoc?.slug || extractSlugAndPattern(canonical.path)?.slug
      if (!oldSlug || oldSlug === live.slug) {
        nextPath = canonical.path
      } else {
        const defaultStructure = await getSiteDefaultPostStructure(req)
        nextPath = resolveEstablishedOrPattern(canonical.path, oldSlug, live.slug as string, defaultStructure)
      }
    } else {
      const defaultStructure = await getSiteDefaultPostStructure(req)
      nextPath = resolvePostPath(defaultStructure, live.slug as string)
    }
  }

  if (isReservedPath(nextPath) || (resourceType === 'page' && nextPath.startsWith('/posts/'))) {
    throw new APIError('That public URL is reserved.', 409)
  }

  const occupant = (await findRoutes(payload, req, { path: { equals: nextPath } })).find((route) => route.id !== canonical?.id)

  if (occupant && !owned.some((route) => route.id === occupant.id)) {
    throw new APIError('That public URL is already in use.', 409)
  }

  if (canonical?.path === nextPath && !occupant) {
    await pointRedirectsAt(req, owned, nextPath, [])
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

  const relation = resourceType === 'page' ? { page: id, post: null } : { page: null, post: id }
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
  } catch (error) {
    if (isUniqueViolation(error)) throw new APIError('That public URL is already in use.', 409)
    throw error
  }
}

export async function resolvePublicPath(payload: Payload, rawPath: string): Promise<ResolvedRoute | null> {
  let path: string
  try {
    const { normalizePath } = await import('./normalize')
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
      const id = route.resourceType === 'page' ? route.page : route.post
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
): Promise<string | null> {
  const result = await payload.find({
    collection: 'url-registry',
    where: {
      and: [
        { recordRole: { equals: 'canonical' } },
        { resourceType: { equals: resourceType } },
        resourceType === 'page' ? { page: { equals: id } } : { post: { equals: id } },
      ],
    },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  const route = result.docs[0] as { path?: string } | undefined
  return route?.path || null
}
