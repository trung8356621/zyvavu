import { canonicalPublicOrigin } from '@/lib/site/origin'
import type { SeoImageInfo } from './types'

/**
 * Resolves a canonical path (e.g. '/', '/gioi-thieu', '/posts/my-post') against the configured site origin.
 */
export function buildAbsoluteUrl(siteOrigin: string, pathOrUrl: string): string {
  const origin = canonicalPublicOrigin(siteOrigin)
  if (!pathOrUrl || pathOrUrl === '/') {
    return `${origin}/`
  }
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    try {
      const parsed = new URL(pathOrUrl)
      return parsed.toString()
    } catch {
      return `${origin}/`
    }
  }
  const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${origin}${normalizedPath}`
}

/**
 * Normalizes a Payload Media object or value into a real SeoImageInfo when valid image data exists.
 * Never fabricates dimensions, captions, or URLs.
 */
export function extractImageInfo(media: unknown, siteOrigin: string): SeoImageInfo | undefined {
  if (!media || typeof media !== 'object') return undefined
  const m = media as {
    url?: unknown
    filename?: unknown
    alt?: unknown
    width?: unknown
    height?: unknown
    mimeType?: unknown
  }

  let rawUrl: string | undefined
  if (typeof m.url === 'string' && m.url.trim()) {
    rawUrl = m.url.trim()
  } else if (typeof m.filename === 'string' && m.filename.trim()) {
    rawUrl = `/api/media/file/${encodeURIComponent(m.filename.trim())}`
  }
  if (!rawUrl) return undefined

  // Exclude non-image mimeTypes when mimeType is explicitly provided (e.g. pdf or video)
  if (typeof m.mimeType === 'string' && m.mimeType.trim() && !m.mimeType.startsWith('image/')) {
    return undefined
  }

  const url = buildAbsoluteUrl(siteOrigin, rawUrl)
  const info: SeoImageInfo = { url }

  if (typeof m.width === 'number' && Number.isFinite(m.width) && m.width > 0) {
    info.width = m.width
  }
  if (typeof m.height === 'number' && Number.isFinite(m.height) && m.height > 0) {
    info.height = m.height
  }
  if (typeof m.alt === 'string' && m.alt.trim()) {
    info.caption = m.alt.trim()
  }
  if (typeof m.mimeType === 'string' && m.mimeType.trim()) {
    info.mimeType = m.mimeType.trim()
  }

  return info
}

/**
 * Extracts primary image from a Payload Post or Page document using only real populated fields.
 */
export function extractDocumentPrimaryImage(
  doc: Record<string, unknown> | null | undefined,
  siteOrigin: string,
): SeoImageInfo | undefined {
  if (!doc || typeof doc !== 'object') return undefined

  // 1. Direct media relation if present
  for (const key of ['featuredImage', 'image', 'media']) {
    if (key in doc && doc[key]) {
      const direct = extractImageInfo(doc[key], siteOrigin)
      if (direct) return direct
    }
  }

  // 2. Lexical content upload nodes if populated with media object
  if (doc.content && typeof doc.content === 'object') {
    const lexicalImg = findFirstLexicalUploadImage(doc.content, siteOrigin)
    if (lexicalImg) return lexicalImg
  }

  // 3. Page layout blocks (banner, slider) if populated with media object
  if (Array.isArray(doc.layout)) {
    for (const block of doc.layout) {
      if (!block || typeof block !== 'object') continue
      const b = block as Record<string, unknown>
      if (b.blockType === 'banner' && b.image) {
        const bannerImg = extractImageInfo(b.image, siteOrigin)
        if (bannerImg) return bannerImg
      }
      if (b.blockType === 'slider' && Array.isArray(b.slides)) {
        for (const slide of b.slides) {
          if (slide && typeof slide === 'object' && 'image' in slide) {
            const slideImg = extractImageInfo((slide as Record<string, unknown>).image, siteOrigin)
            if (slideImg) return slideImg
          }
        }
      }
    }
  }

  return undefined
}

function findFirstLexicalUploadImage(node: unknown, siteOrigin: string): SeoImageInfo | undefined {
  if (!node || typeof node !== 'object') return undefined
  const n = node as Record<string, unknown>

  if (n.type === 'upload' && (!n.relationTo || n.relationTo === 'media') && n.value) {
    const img = extractImageInfo(n.value, siteOrigin)
    if (img) return img
  }

  if (n.root && typeof n.root === 'object') {
    return findFirstLexicalUploadImage(n.root, siteOrigin)
  }

  if (Array.isArray(n.children)) {
    for (const child of n.children) {
      const found = findFirstLexicalUploadImage(child, siteOrigin)
      if (found) return found
    }
  }

  return undefined
}

/**
 * Extracts plain text from a Lexical editor JSON state without fabricating or rewriting content.
 */
export function extractLexicalPlainText(lexicalData: unknown): string {
  if (!lexicalData || typeof lexicalData !== 'object') return ''
  const chunks: string[] = []

  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return
    const n = node as Record<string, unknown>

    if (typeof n.text === 'string' && n.text) {
      chunks.push(n.text)
    }

    if (n.root && typeof n.root === 'object') {
      walk(n.root)
      return
    }

    if (Array.isArray(n.children)) {
      for (const child of n.children) {
        walk(child)
      }
      const nodeType = typeof n.type === 'string' ? n.type : ''
      if (nodeType === 'paragraph' || nodeType === 'heading' || nodeType === 'listitem' || nodeType === 'quote') {
        chunks.push(' ')
      }
    }
  }

  walk(lexicalData)
  return chunks.join('').replace(/\s+/g, ' ').trim()
}

/**
 * Extracts plain text from Page layout blocks (richText, banner, slider) when excerpt is absent.
 */
export function extractLayoutBlocksPlainText(layout: unknown): string {
  if (!Array.isArray(layout)) return ''
  const parts: string[] = []
  for (const block of layout) {
    if (!block || typeof block !== 'object') continue
    const b = block as Record<string, unknown>
    if (b.blockType === 'richText' && b.content) {
      const text = extractLexicalPlainText(b.content)
      if (text) parts.push(text)
    } else if (b.blockType === 'banner') {
      if (typeof b.heading === 'string' && b.heading.trim()) parts.push(b.heading.trim())
      if (typeof b.text === 'string' && b.text.trim()) parts.push(b.text.trim())
    } else if (b.blockType === 'slider' && Array.isArray(b.slides)) {
      for (const slide of b.slides) {
        if (!slide || typeof slide !== 'object') continue
        const s = slide as Record<string, unknown>
        if (typeof s.heading === 'string' && s.heading.trim()) parts.push(s.heading.trim())
        if (typeof s.text === 'string' && s.text.trim()) parts.push(s.text.trim())
      }
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * Truncates a plain text summary cleanly at word boundary without rewriting content.
 */
export function truncateDescription(text: string, maxLength = 160): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  const sliced = normalized.slice(0, maxLength - 1)
  const lastSpace = sliced.lastIndexOf(' ')
  if (lastSpace > maxLength * 0.6) {
    return `${sliced.slice(0, lastSpace).trim()}…`
  }
  return `${sliced.trim()}…`
}

/**
 * Counts words in plain text.
 */
export function countWords(text: string): number {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (!trimmed) return 0
  return trimmed.split(' ').filter(Boolean).length
}

/**
 * Validates and normalizes an ISO 8601 date string. Returns undefined if invalid.
 */
export function toValidIsoDate(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const time = Date.parse(value)
  if (Number.isNaN(time)) return undefined
  return new Date(time).toISOString()
}

/**
 * Formats a valid date string into RFC 2822 / UTC format for RSS 2.0 (<pubDate>, <lastBuildDate>).
 * Returns undefined if the input is not a real valid date.
 */
export function toRfc2822Date(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const time = Date.parse(value)
  if (Number.isNaN(time)) return undefined
  return new Date(time).toUTCString()
}

/**
 * Strictly escapes XML special characters and strips invalid XML 1.0 control characters.
 */
export function escapeXml(input: string): string {
  // Strip illegal XML 1.0 control chars: 0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F
  const cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
  return cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Safely serializes JSON-LD object for embedding inside <script type="application/ld+json">.
 * Escapes <, >, & to prevent script-tag breakout or XSS.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}
