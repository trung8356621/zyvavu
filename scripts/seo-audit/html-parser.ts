// @ts-nocheck
import { JSDOM } from 'jsdom'
import type { HeadingItem } from './types'

export interface ParsedHtmlDocument {
  title: string | null
  metaDescription: string | null
  metaRobots: string | null
  canonicalTags: string[]
  rssAlternateUrl: string | null
  h1List: string[]
  headings: HeadingItem[]
  headingHierarchyErrors: string[]
  links: Array<{ href: string; text: string; rel?: string }>
  images: Array<{ src: string; alt: string | null; hasAlt: boolean }>
  hasMainTag: boolean
  hasArticleTag: boolean
  hasNavTag: boolean
  hasHeaderTag: boolean
  hasFooterTag: boolean
  pagination: {
    hasPagination: boolean
    prevHref?: string
    nextHref?: string
  }
  jsonLdRawScripts: string[]
  bodyPlainText: string
  approximateWordCount: number
}

export function parseHtml(html: string, baseUrl: string): ParsedHtmlDocument {
  const dom = new JSDOM(html, { url: baseUrl })
  const doc = dom.window.document

  // Title
  const titleTag = doc.querySelector('title')
  const title = titleTag?.textContent?.trim() || null

  // Meta Description
  const metaDesc = doc.querySelector('meta[name="description"]')
  const metaDescription = metaDesc?.getAttribute('content')?.trim() || null

  // Meta Robots
  const metaRobotsEl = doc.querySelector('meta[name="robots"]') || doc.querySelector('meta[name="googlebot"]')
  const metaRobots = metaRobotsEl?.getAttribute('content')?.trim() || null

  // Canonical Tags
  const canonicalEls = Array.from(doc.querySelectorAll('link[rel="canonical"]'))
  const canonicalTags: string[] = canonicalEls
    .map((el) => el.getAttribute('href')?.trim())
    .filter((href): href is string => Boolean(href))

  // RSS alternate
  const rssEl = doc.querySelector('link[rel="alternate"][type="application/rss+xml"]')
  const rssAlternateUrl = rssEl?.getAttribute('href')?.trim() || null

  // Headings
  const headingEls = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  const headings: HeadingItem[] = []
  const h1List: string[] = []
  const headingHierarchyErrors: string[] = []

  let lastLevel = 0
  for (const el of headingEls) {
    const tag = el.tagName.toLowerCase()
    const level = parseInt(tag.replace('h', ''), 10)
    const text = el.textContent?.trim() || ''

    headings.push({ tag, text, level })
    if (level === 1) {
      h1List.push(text)
    }

    if (lastLevel > 0 && level > lastLevel + 1) {
      headingHierarchyErrors.push(
        `Skipped heading level from <h${lastLevel}> to <h${level}> ("${text.slice(0, 40)}")`
      )
    }
    lastLevel = level
  }

  // Anchor links
  const anchorEls = Array.from(doc.querySelectorAll('a[href]'))
  const links: Array<{ href: string; text: string; rel?: string }> = []
  for (const a of anchorEls) {
    const rawHref = a.getAttribute('href')?.trim() || ''
    if (!rawHref || rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref === '#') {
      continue
    }

    let resolvedHref = rawHref
    try {
      resolvedHref = new URL(rawHref, baseUrl).href
    } catch {
      // Keep raw
    }

    const text = a.textContent?.trim() || ''
    const rel = a.getAttribute('rel')?.trim() || undefined
    links.push({ href: resolvedHref, text, rel })
  }

  // Images
  const imgEls = Array.from(doc.querySelectorAll('img'))
  const images: Array<{ src: string; alt: string | null; hasAlt: boolean }> = []
  for (const img of imgEls) {
    const src = img.getAttribute('src')?.trim() || ''
    const hasAlt = img.hasAttribute('alt')
    const alt = hasAlt ? (img.getAttribute('alt')?.trim() ?? '') : null
    images.push({ src, alt, hasAlt })
  }

  // Landmarks
  const hasMainTag = Boolean(doc.querySelector('main'))
  const hasArticleTag = Boolean(doc.querySelector('article'))
  const hasNavTag = Boolean(doc.querySelector('nav'))
  const hasHeaderTag = Boolean(doc.querySelector('header'))
  const hasFooterTag = Boolean(doc.querySelector('footer'))

  // Pagination
  const prevLink = doc.querySelector('link[rel="prev"]')?.getAttribute('href') || undefined
  const nextLink = doc.querySelector('link[rel="next"]')?.getAttribute('href') || undefined
  const hasPaginationUI = Boolean(doc.querySelector('.pagination, nav[aria-label*="pagination" i], [aria-label*="phân trang" i]'))
  const pagination = {
    hasPagination: Boolean(prevLink || nextLink || hasPaginationUI),
    prevHref: prevLink,
    nextHref: nextLink,
  }

  // JSON-LD scripts
  const scriptEls = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))
  const jsonLdRawScripts: string[] = scriptEls
    .map((s) => s.textContent?.trim() || '')
    .filter((s) => Boolean(s))

  // Plain text & word count
  const bodyText = doc.body?.textContent || ''
  const words = bodyText.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)

  return {
    title,
    metaDescription,
    metaRobots,
    canonicalTags,
    rssAlternateUrl,
    h1List,
    headings,
    headingHierarchyErrors,
    links,
    images,
    hasMainTag,
    hasArticleTag,
    hasNavTag,
    hasHeaderTag,
    hasFooterTag,
    pagination,
    jsonLdRawScripts,
    bodyPlainText: bodyText,
    approximateWordCount: words.length,
  }
}
