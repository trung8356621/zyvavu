/**
 * Unified Heading/Text content contracts for Tiptap inline edit.
 *
 * Unmarked props.text = exact legacy plain (never inferred from "<").
 * Rich content: <!--zyvavu-rt:v1--> + sanitized HTML (p/br/marks/links).
 */

export const RICHTEXT_MARKER = '<!--zyvavu-rt:v1-->'

const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'a'])

export type InlineAtomKind = 'Heading' | 'Text'
export type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p'

export function isParagraphTag(tag?: string | null): boolean {
  return (tag || '').toLowerCase() === 'p'
}

/** Multi-paragraph Enter behavior for P tags and legacy Text atoms. */
export function allowsMultilineEnter(kind: InlineAtomKind, tag?: string | null): boolean {
  return kind === 'Text' || isParagraphTag(tag)
}

export function isRichTextStored(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.startsWith(RICHTEXT_MARKER)
}

export function unwrapStoredText(value: string | undefined | null): {
  mode: 'plain' | 'html'
  content: string
} {
  if (value == null) return { mode: 'plain', content: '' }
  if (isRichTextStored(value)) {
    return { mode: 'html', content: value.slice(RICHTEXT_MARKER.length) }
  }
  return { mode: 'plain', content: value }
}

export function wrapRichTextHtml(sanitizedHtml: string): string {
  return `${RICHTEXT_MARKER}${sanitizedHtml}`
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, '\u00a0')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
}

/** Allow http(s), mailto, tel, relative, hash, query. Reject javascript/data/vbscript. */
export function sanitizeHref(href: string | undefined | null): string | null {
  if (href == null) return null
  const value = href.trim()
  if (!value) return null
  if (/^(?:javascript|data|vbscript):/i.test(value)) return null
  if (/^(?:https?:|mailto:|tel:|\/|#|\?)/i.test(value)) return value
  // Protocol-relative or bare relative path without scheme
  if (value.startsWith('//')) return `https:${value}`
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) return value
  return null
}

function readHrefAttr(rawTag: string): string | null {
  const match = rawTag.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
  return sanitizeHref(match?.[1] ?? match?.[2] ?? match?.[3] ?? '')
}

/**
 * SSR-safe allowlist sanitizer. No window/document.
 * Tags: p/br/strong/em/b/i/u/s/a(href only).
 */
export function sanitizeTextHtml(input: string): string {
  if (!input) return ''
  let i = 0
  let out = ''
  const openStack: string[] = []

  const pushText = (raw: string) => {
    if (!raw) return
    out += escapeHtml(decodeBasicEntities(raw))
  }

  while (i < input.length) {
    const lt = input.indexOf('<', i)
    if (lt === -1) {
      pushText(input.slice(i))
      break
    }
    pushText(input.slice(i, lt))
    const gt = input.indexOf('>', lt + 1)
    if (gt === -1) {
      pushText(input.slice(lt))
      break
    }
    const rawTag = input.slice(lt + 1, gt).trim()
    i = gt + 1

    if (!rawTag || rawTag.startsWith('!') || rawTag.startsWith('?')) continue

    const isClose = rawTag.startsWith('/')
    const nameMatch = (isClose ? rawTag.slice(1) : rawTag).match(/^([a-zA-Z][\w:-]*)/)
    if (!nameMatch) continue
    const name = nameMatch[1].toLowerCase()

    if (!ALLOWED_TAGS.has(name)) continue

    if (name === 'br') {
      if (!isClose) out += '<br />'
      continue
    }

    if (isClose) {
      const idx = openStack.lastIndexOf(name)
      if (idx === -1) continue
      while (openStack.length > idx) {
        const tag = openStack.pop()!
        out += `</${tag}>`
      }
      continue
    }

    if (rawTag.endsWith('/')) continue

    if (name === 'a') {
      const href = readHrefAttr(rawTag)
      if (!href) continue
      openStack.push('a')
      out += `<a href="${escapeHtml(href)}">`
      continue
    }

    openStack.push(name)
    out += `<${name}>`
  }

  while (openStack.length) {
    out += `</${openStack.pop()}>`
  }

  return out
}

export function normalizeTextHtml(html: string): string {
  const sanitized = sanitizeTextHtml(html).trim()
  if (!sanitized || sanitized === '<p></p>' || sanitized === '<p><br /></p>') {
    return '<p></p>'
  }
  return sanitized
}

export function textEditorContent(stored: string | undefined | null): string {
  const { mode, content } = unwrapStoredText(stored)
  if (mode === 'html') return normalizeTextHtml(content)
  if (!content) return '<p></p>'
  const parts = content.split(/\n/)
  return `<p>${parts.map(escapeHtml).join('<br />')}</p>`
}

/** Unified serialize for Heading (H1–H6/P) and legacy Text. */
export function serializeInlineFromEditor(html: string, opts?: { forcePlain?: boolean }): string {
  const sanitized = normalizeTextHtml(html)
  if (opts?.forcePlain) return htmlToPlainText(sanitized)
  if (isTrivialPlainParagraph(sanitized)) return htmlToPlainText(sanitized)
  return wrapRichTextHtml(sanitized)
}

/** @deprecated use serializeInlineFromEditor */
export function serializeHeadingFromEditor(plainOrHtml: string): string {
  return htmlToPlainText(plainOrHtml)
}

/** @deprecated use serializeInlineFromEditor */
export function serializeTextFromEditor(html: string, opts?: { forcePlain?: boolean }): string {
  return serializeInlineFromEditor(html, opts)
}

function isTrivialPlainParagraph(html: string): boolean {
  if (/<(strong|em|b|i|u|s|a)\b/i.test(html)) return false
  const openCount = (html.match(/<p\b/gi) || []).length
  if (openCount !== 1) return false
  return /^<p>[\s\S]*<\/p>$/i.test(html)
}

export function htmlToPlainText(html: string): string {
  if (!html) return ''
  let text = html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
    .replace(/<\s*p\b[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
  text = decodeBasicEntities(text)
  return text.replace(/\n$/, '')
}

export function resolveTextRender(stored: string | undefined | null): {
  mode: 'plain' | 'html'
  plain?: string
  html?: string
} {
  const { mode, content } = unwrapStoredText(stored)
  if (mode === 'plain') return { mode: 'plain', plain: content }
  return { mode: 'html', html: sanitizeTextHtml(content) }
}

export function canInlineEditAtom(type: string, bound: boolean): type is InlineAtomKind {
  return !bound && (type === 'Heading' || type === 'Text')
}
