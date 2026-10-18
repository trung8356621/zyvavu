import { decideIndexability } from './indexability'
import type { Payload } from 'payload'

import { loadPublicSiteSettings } from '@/lib/site/settings'
import { normalizePath } from '@/lib/url/normalize'
import {
  getCanonicalPath,
  getCanonicalPathsForResources,
  isPublicResource,
  resolvePublicPath,
  type ResourceDoc,
} from '@/lib/url/registry'
import type {
  SeoBreadcrumbItem,
  SeoPageContext,
  SeoSiteInfo,
  SeoTermInfo,
} from './types'
import {
  buildAbsoluteUrl,
  countWords,
  extractDocumentPrimaryImage,
  extractImageInfo,
  extractLayoutBlocksPlainText,
  extractLexicalPlainText,
  toValidIsoDate,
  truncateDescription,
} from './utils'

async function loadSeoSiteInfo(payload: Payload): Promise<SeoSiteInfo> {
  const settings = await loadPublicSiteSettings(payload)
  let logo = settings.logoUrl
    ? {
        url: buildAbsoluteUrl(settings.siteUrl, settings.logoUrl),
        caption: settings.logoAlt || settings.siteName,
      }
    : undefined

  try {
    const rawSettings = await payload.findGlobal({
      slug: 'settings',
      depth: 1,
      overrideAccess: true,
    })
    if (rawSettings?.logo && typeof rawSettings.logo === 'object') {
      const extracted = extractImageInfo(rawSettings.logo, settings.siteUrl)
      if (extracted) {
        logo = {
          ...extracted,
          caption: extracted.caption || settings.logoAlt || settings.siteName,
        }
      }
    }
  } catch {
    // Preserve fallback settings
  }

  return {
    ...settings,
    logo,
  }
}

function buildNotFoundContext(site: SeoSiteInfo, requestedPath: string): SeoPageContext {
  return {
    status: 'not_found',
    requestedPath,
    isIndexable: decideIndexability({ status: 'not_found', canonicalPath: null }).indexable,
    site,
    title: `Not Found — ${site.siteName}`,
    documentTitle: 'Not Found',
    description: '',
    breadcrumbs: [],
  }
}

function buildRedirectContext(
  site: SeoSiteInfo,
  requestedPath: string,
  redirectTarget: string,
): SeoPageContext {
  return {
    status: 'redirect',
    requestedPath,
    redirectTarget,
    isIndexable: decideIndexability({
      status: 'redirect',
      canonicalPath: null,
      recordRole: 'redirect',
    }).indexable,
    site,
    title: site.siteName,
    documentTitle: site.siteName,
    description: '',
    breadcrumbs: [],
  }
}

function buildDefaultHomeContext(site: SeoSiteInfo): SeoPageContext {
  const canonicalPath = '/'
  const canonicalUrl = buildAbsoluteUrl(site.siteUrl, canonicalPath)
  const title = site.tagline ? `${site.siteName} — ${site.tagline}` : site.siteName
  const description = site.tagline || site.siteName

  return {
    status: 'ok',
    requestedPath: '/',
    resourceType: 'home',
    isIndexable: decideIndexability({
      status: 'ok',
      resourceType: 'home',
      canonicalPath,
      recordRole: 'canonical',
    }).indexable,
    site,
    canonicalPath,
    canonicalUrl,
    title,
    documentTitle: site.siteName,
    description,
    breadcrumbs: [],
  }
}

async function resolveTermInfos(
  payload: Payload,
  taxonomy: 'category' | 'tag',
  rawTerms: unknown,
  siteOrigin: string,
): Promise<SeoTermInfo[]> {
  if (!Array.isArray(rawTerms) || rawTerms.length === 0) return []

  const validDocs: Array<{ id: number; title: string; slug: string }> = []
  for (const item of rawTerms) {
    if (!item || typeof item !== 'object') continue
    const t = item as { id?: unknown; title?: unknown; slug?: unknown }
    if (typeof t.id === 'number' && typeof t.title === 'string' && t.title.trim() && typeof t.slug === 'string' && t.slug.trim()) {
      validDocs.push({
        id: t.id,
        title: t.title.trim(),
        slug: t.slug.trim(),
      })
    }
  }

  if (validDocs.length === 0) return []

  const pathMap = await getCanonicalPathsForResources(
    payload,
    taxonomy,
    validDocs.map((d) => d.id),
  )

  return validDocs.map((doc) => {
    const canonicalPath = pathMap.get(doc.id) || null
    return {
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      canonicalPath,
      canonicalUrl: canonicalPath ? buildAbsoluteUrl(siteOrigin, canonicalPath) : null,
    }
  })
}

/**
 * Centralized SEO Page Context resolver.
 * Uses URL Registry as the authoritative canonical path source.
 * Supports Home, Post, Page, Category, and Tag.
 * Never leaks draft, private, or 404 content into public metadata or graph output.
 */
export async function resolveSeoPageContext(
  payload: Payload,
  rawPath: string,
): Promise<SeoPageContext> {
  const site = await loadSeoSiteInfo(payload)
  const homeUrl = buildAbsoluteUrl(site.siteUrl, '/')

  let normalizedRequested: string
  try {
    normalizedRequested = rawPath === '/' ? '/' : normalizePath(rawPath)
  } catch {
    return buildNotFoundContext(site, rawPath || '/')
  }

  const resolved = await resolvePublicPath(payload, normalizedRequested)

  if (!resolved) {
    if (normalizedRequested === '/') {
      return buildDefaultHomeContext(site)
    }
    return buildNotFoundContext(site, normalizedRequested)
  }

  if (resolved.kind === 'redirect') {
    return buildRedirectContext(site, normalizedRequested, resolved.target)
  }

  const canonicalPath =
    (await getCanonicalPath(payload, resolved.resourceType, resolved.id)) || normalizedRequested
  const canonicalUrl = buildAbsoluteUrl(site.siteUrl, canonicalPath)

  if (resolved.resourceType === 'page') {
    const pageDoc = (await payload.findByID({
      collection: 'pages',
      id: resolved.id,
      depth: 2,
      draft: false,
      overrideAccess: true,
      disableErrors: true,
    })) as (Record<string, unknown> & ResourceDoc) | null

    if (!pageDoc || !isPublicResource('page', pageDoc)) {
      if (normalizedRequested === '/') {
        return buildDefaultHomeContext(site)
      }
      return buildNotFoundContext(site, normalizedRequested)
    }

    const pageTitle = typeof pageDoc.title === 'string' && pageDoc.title.trim() ? pageDoc.title.trim() : site.siteName
    const pageSlug = typeof pageDoc.slug === 'string' ? pageDoc.slug : ''
    const isHome = canonicalPath === '/' || pageSlug === 'home'

    const rawExcerpt = typeof pageDoc.excerpt === 'string' ? pageDoc.excerpt.trim() : ''
    const blocksText = rawExcerpt ? '' : extractLayoutBlocksPlainText(pageDoc.layout)
    const description =
      rawExcerpt ||
      (blocksText ? truncateDescription(blocksText) : '') ||
      site.tagline ||
      site.siteName

    const title = isHome
      ? pageTitle && pageTitle.toLowerCase() !== 'home' && pageTitle !== site.siteName
        ? `${pageTitle} — ${site.siteName}`
        : site.tagline
          ? `${site.siteName} — ${site.tagline}`
          : site.siteName
      : `${pageTitle} — ${site.siteName}`

    const publishedAt = toValidIsoDate(pageDoc.createdAt)
    const modifiedAt = toValidIsoDate(pageDoc.updatedAt)
    const primaryImage = extractDocumentPrimaryImage(pageDoc, site.siteUrl)

    const breadcrumbs: SeoBreadcrumbItem[] = isHome
      ? []
      : [
          { name: site.siteName, url: homeUrl },
          { name: pageTitle, url: canonicalUrl },
        ]

    return {
      status: 'ok',
      requestedPath: normalizedRequested,
      resourceType: isHome ? 'home' : 'page',
      isIndexable: decideIndexability({
        status: 'ok',
        resourceType: isHome ? 'home' : 'page',
        doc: pageDoc,
        canonicalPath: isHome ? '/' : canonicalPath,
        recordRole: 'canonical',
      }).indexable,
      site,
      canonicalPath: isHome ? '/' : canonicalPath,
      canonicalUrl: isHome ? homeUrl : canonicalUrl,
      title,
      documentTitle: isHome ? site.siteName : pageTitle,
      description,
      publishedAt,
      modifiedAt,
      primaryImage,
      breadcrumbs,
      page: {
        id: pageDoc.id,
        title: pageTitle,
        slug: pageSlug,
        excerpt: rawExcerpt || undefined,
        isHome,
      },
      document: pageDoc,
    }
  }

  if (resolved.resourceType === 'post') {
    const postDoc = (await payload.findByID({
      collection: 'posts',
      id: resolved.id,
      depth: 2,
      draft: false,
      overrideAccess: true,
      disableErrors: true,
    })) as (Record<string, unknown> & ResourceDoc) | null

    if (!postDoc || !isPublicResource('post', postDoc)) {
      return buildNotFoundContext(site, normalizedRequested)
    }

    const postTitle = typeof postDoc.title === 'string' ? postDoc.title.trim() : ''
    const postSlug = typeof postDoc.slug === 'string' ? postDoc.slug : ''
    if (!postTitle || !postSlug) {
      return buildNotFoundContext(site, normalizedRequested)
    }

    const rawExcerpt = typeof postDoc.excerpt === 'string' ? postDoc.excerpt.trim() : ''
    const lexicalText = extractLexicalPlainText(postDoc.content)
    const wordCount = countWords(lexicalText || rawExcerpt)
    const description =
      rawExcerpt ||
      (lexicalText ? truncateDescription(lexicalText) : '') ||
      site.tagline ||
      site.siteName

    const publishedAt = toValidIsoDate(postDoc.createdAt)
    const modifiedAt = toValidIsoDate(postDoc.updatedAt) || publishedAt
    const primaryImage = extractDocumentPrimaryImage(postDoc, site.siteUrl)

    const categories = await resolveTermInfos(payload, 'category', postDoc.categories, site.siteUrl)
    const tags = await resolveTermInfos(payload, 'tag', postDoc.tags, site.siteUrl)

    const breadcrumbs: SeoBreadcrumbItem[] = [{ name: site.siteName, url: homeUrl }]
    const primaryCategory = categories.find((cat) => Boolean(cat.canonicalUrl))
    if (primaryCategory && primaryCategory.canonicalUrl) {
      breadcrumbs.push({
        name: primaryCategory.title,
        url: primaryCategory.canonicalUrl,
      })
    }
    breadcrumbs.push({
      name: postTitle,
      url: canonicalUrl,
    })

    return {
      status: 'ok',
      requestedPath: normalizedRequested,
      resourceType: 'post',
      isIndexable: decideIndexability({
        status: 'ok',
        resourceType: 'post',
        doc: postDoc,
        canonicalPath,
        recordRole: 'canonical',
      }).indexable,
      site,
      canonicalPath,
      canonicalUrl,
      title: `${postTitle} — ${site.siteName}`,
      documentTitle: postTitle,
      description,
      publishedAt,
      modifiedAt,
      primaryImage,
      breadcrumbs,
      post: {
        id: postDoc.id,
        title: postTitle,
        slug: postSlug,
        excerpt: rawExcerpt || undefined,
        wordCount: wordCount > 0 ? wordCount : undefined,
        categories,
        tags,
      },
      document: postDoc,
    }
  }

  if (resolved.resourceType === 'category' || resolved.resourceType === 'tag') {
    const collectionSlug = resolved.resourceType === 'category' ? 'categories' : 'tags'
    const termDoc = (await payload.findByID({
      collection: collectionSlug,
      id: resolved.id,
      depth: 1,
      overrideAccess: true,
      disableErrors: true,
    })) as (Record<string, unknown> & ResourceDoc) | null

    if (!termDoc || !isPublicResource(resolved.resourceType, termDoc)) {
      return buildNotFoundContext(site, normalizedRequested)
    }

    const termTitle = typeof termDoc.title === 'string' ? termDoc.title.trim() : ''
    const termSlug = typeof termDoc.slug === 'string' ? termDoc.slug.trim() : ''
    if (!termTitle || !termSlug) {
      return buildNotFoundContext(site, normalizedRequested)
    }

    const modifiedAt = toValidIsoDate(termDoc.updatedAt) || toValidIsoDate(termDoc.createdAt)
    const description = site.tagline
      ? `${termTitle} — ${site.tagline}`
      : `${termTitle} — ${site.siteName}`

    const breadcrumbs: SeoBreadcrumbItem[] = [
      { name: site.siteName, url: homeUrl },
      { name: termTitle, url: canonicalUrl },
    ]

    return {
      status: 'ok',
      requestedPath: normalizedRequested,
      resourceType: resolved.resourceType,
      isIndexable: decideIndexability({
        status: 'ok',
        resourceType: resolved.resourceType,
        doc: termDoc,
        canonicalPath,
        recordRole: 'canonical',
      }).indexable,
      site,
      canonicalPath,
      canonicalUrl,
      title: `${termTitle} — ${site.siteName}`,
      documentTitle: termTitle,
      description,
      modifiedAt,
      breadcrumbs,
      term: {
        id: termDoc.id,
        taxonomy: resolved.resourceType,
        title: termTitle,
        slug: termSlug,
      },
      document: termDoc,
    }
  }

  return buildNotFoundContext(site, normalizedRequested)
}
