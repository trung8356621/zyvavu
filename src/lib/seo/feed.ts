import { createHash } from 'node:crypto'
import type { Payload } from 'payload'

import { loadPublicSiteSettings } from '@/lib/site/settings'
import { getCanonicalPathsForResources, isPublicResource, type ResourceDoc } from '@/lib/url/registry'
import {
  buildAbsoluteUrl,
  escapeXml,
  extractLexicalPlainText,
  toRfc2822Date,
  truncateDescription,
} from './utils'

export const DEFAULT_FEED_LIMIT = 20
export const MAX_FEED_LIMIT = 50

export interface RssFeedItem {
  id: number
  title: string
  canonicalUrl: string
  description: string
  publishedRfc2822?: string
  publishedTimeMs?: number
  updatedTimeMs?: number
  categories: string[]
}

export interface RssFeedBuildResult {
  xml: string
  etag: string
  lastModified?: string
  lastModifiedMs?: number
  items: RssFeedItem[]
}

type PostFeedDoc = ResourceDoc & {
  title?: unknown
  excerpt?: unknown
  content?: unknown
  categories?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

function normalizeEtagValue(raw: string): string {
  return raw.trim().replace(/^W\//i, '')
}

function matchesIfNoneMatch(ifNoneMatchHeader: string | null, currentEtag: string): boolean {
  if (!ifNoneMatchHeader) return false
  const trimmed = ifNoneMatchHeader.trim()
  if (trimmed === '*') return true

  const target = normalizeEtagValue(currentEtag)
  const candidates = trimmed.split(',').map((part) => normalizeEtagValue(part))
  return candidates.includes(target)
}

function matchesIfModifiedSince(
  ifModifiedSinceHeader: string | null,
  lastModifiedMs: number | undefined,
): boolean {
  if (!ifModifiedSinceHeader || typeof lastModifiedMs !== 'number') return false
  const parsed = Date.parse(ifModifiedSinceHeader)
  if (Number.isNaN(parsed)) return false
  // HTTP dates have 1-second resolution
  const resourceSeconds = Math.floor(lastModifiedMs / 1000) * 1000
  return resourceSeconds <= parsed
}

/**
 * Queries recent published posts (bounded query), resolves authoritative canonical URLs from URL Registry,
 * and constructs a valid RSS 2.0 XML document with ETag and Last-Modified metadata.
 */
export async function buildRssFeed(
  payload: Payload,
  options?: { limit?: number },
): Promise<RssFeedBuildResult> {
  const settings = await loadPublicSiteSettings(payload)
  const rawLimit = options?.limit ?? DEFAULT_FEED_LIMIT
  const limit = Math.min(Math.max(1, Math.trunc(rawLimit)), MAX_FEED_LIMIT)

  const postsResult = await payload
    .find({
      collection: 'posts',
      where: {
        _status: { equals: 'published' },
      },
      sort: '-createdAt',
      limit,
      depth: 1,
      draft: false,
      pagination: false,
      overrideAccess: true,
    })
    .catch(() => ({ docs: [] }))

  const rawDocs = (postsResult.docs || []) as PostFeedDoc[]
  const publicDocs = rawDocs.filter((doc) => isPublicResource('post', doc))

  const postIds = publicDocs.map((d) => d.id).filter((id) => typeof id === 'number')
  const canonicalPaths = await getCanonicalPathsForResources(payload, 'post', postIds)

  const items: RssFeedItem[] = []
  let latestTimestampMs: number | undefined

  for (const doc of publicDocs) {
    const canonicalPath = canonicalPaths.get(doc.id)
    if (!canonicalPath) continue

    const title = typeof doc.title === 'string' ? doc.title.trim() : ''
    if (!title) continue

    const canonicalUrl = buildAbsoluteUrl(settings.siteUrl, canonicalPath)

    const rawExcerpt = typeof doc.excerpt === 'string' ? doc.excerpt.trim() : ''
    const lexicalText = rawExcerpt ? '' : extractLexicalPlainText(doc.content)
    const description = rawExcerpt || (lexicalText ? truncateDescription(lexicalText, 280) : '')

    const publishedRfc2822 = toRfc2822Date(doc.createdAt)
    const createdMs = typeof doc.createdAt === 'string' ? Date.parse(doc.createdAt) : NaN
    const updatedMs = typeof doc.updatedAt === 'string' ? Date.parse(doc.updatedAt) : NaN

    const validCreatedMs = !Number.isNaN(createdMs) ? createdMs : undefined
    const validUpdatedMs = !Number.isNaN(updatedMs) ? updatedMs : validCreatedMs

    const candidateMs = validUpdatedMs ?? validCreatedMs
    if (typeof candidateMs === 'number') {
      if (latestTimestampMs === undefined || candidateMs > latestTimestampMs) {
        latestTimestampMs = candidateMs
      }
    }

    const categories: string[] = []
    if (Array.isArray(doc.categories)) {
      for (const cat of doc.categories) {
        if (cat && typeof cat === 'object' && 'title' in cat) {
          const catTitle = (cat as { title?: unknown }).title
          if (typeof catTitle === 'string' && catTitle.trim()) {
            categories.push(catTitle.trim())
          }
        }
      }
    }

    items.push({
      id: doc.id,
      title,
      canonicalUrl,
      description,
      publishedRfc2822,
      publishedTimeMs: validCreatedMs,
      updatedTimeMs: validUpdatedMs,
      categories,
    })
  }

  const homeUrl = buildAbsoluteUrl(settings.siteUrl, '/')
  const feedUrl = buildAbsoluteUrl(settings.siteUrl, '/feed/')
  const channelTitle = settings.siteName
  const channelDesc = settings.tagline || settings.siteName
  const lastModified =
    typeof latestTimestampMs === 'number' ? new Date(latestTimestampMs).toUTCString() : undefined

  const xmlLines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(channelTitle)}</title>`,
    `    <link>${escapeXml(homeUrl)}</link>`,
    `    <description>${escapeXml(channelDesc)}</description>`,
    `    <language>${escapeXml(settings.language)}</language>`,
    `    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
  ]

  if (lastModified) {
    xmlLines.push(`    <lastBuildDate>${escapeXml(lastModified)}</lastBuildDate>`)
  }

  for (const item of items) {
    xmlLines.push('    <item>')
    xmlLines.push(`      <title>${escapeXml(item.title)}</title>`)
    xmlLines.push(`      <link>${escapeXml(item.canonicalUrl)}</link>`)
    xmlLines.push(`      <guid isPermaLink="true">${escapeXml(item.canonicalUrl)}</guid>`)
    if (item.publishedRfc2822) {
      xmlLines.push(`      <pubDate>${escapeXml(item.publishedRfc2822)}</pubDate>`)
    }
    xmlLines.push(`      <description>${escapeXml(item.description)}</description>`)
    for (const category of item.categories) {
      xmlLines.push(`      <category>${escapeXml(category)}</category>`)
    }
    xmlLines.push('    </item>')
  }

  xmlLines.push('  </channel>')
  xmlLines.push('</rss>')

  const xml = `${xmlLines.join('\n')}\n`
  const hash = createHash('sha256').update(xml).digest('hex').slice(0, 32)
  const etag = `"${hash}"`

  return {
    xml,
    etag,
    lastModified,
    lastModifiedMs: latestTimestampMs,
    items,
  }
}

/**
 * Handles GET/HEAD HTTP requests for /feed/ with RFC-compliant conditional caching (ETag & Last-Modified).
 */
export async function handleRssFeedRequest(
  request: Request,
  payload: Payload,
): Promise<Response> {
  const feed = await buildRssFeed(payload)

  const headers = new Headers({
    'Content-Type': 'application/rss+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=0, must-revalidate',
    ETag: feed.etag,
    'X-Content-Type-Options': 'nosniff',
  })

  if (feed.lastModified) {
    headers.set('Last-Modified', feed.lastModified)
  }

  const ifNoneMatch = request.headers.get('if-none-match')
  const ifModifiedSince = request.headers.get('if-modified-since')

  if (ifNoneMatch !== null) {
    if (matchesIfNoneMatch(ifNoneMatch, feed.etag)) {
      return new Response(null, { status: 304, headers })
    }
  } else if (matchesIfModifiedSince(ifModifiedSince, feed.lastModifiedMs)) {
    return new Response(null, { status: 304, headers })
  }

  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers })
  }

  return new Response(feed.xml, { status: 200, headers })
}
