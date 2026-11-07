/**
 * Heading/Text content contracts for Tiptap inline edit V1.
 *
 * Heading: always plain string in props.text.
 * Text: unmarked props.text is exact legacy plain text.
 *       Rich Text uses explicit marker + sanitized HTML (never inferred from "<").
 */

export const RICHTEXT_MARKER = '<!--zyvavu-rt:v1-->'

const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'em', 'b', 'i', 'u', 's'])

export type InlineAtomKind = 'Heading' | 'Text'

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

/** Escape plain text for safe HTML embedding (SSR-safe). */
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

/**
 * SSR-safe allowlist sanitizer. No window/document.
 * Keeps p/br/strong/em/b/i/u/s only; strips all attributes and other tags (keeps text).
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

    // Void-ish self-close already handled for br; ignore other self-closing noise.
    if (rawTag.endsWith('/')) continue

    openStack.push(name)
    out += `<${name}>`
  }

  while (openStack.length) {
    out += `</${openStack.pop()}>`
  }

  return out
}

/** Normalize empty / trivial rich HTML back toward a single empty paragraph. */
export function normalizeTextHtml(html: string): string {
  const sanitized = sanitizeTextHtml(html).trim()
  if (!sanitized || sanitized === '<p></p>' || sanitized === '<p><br /></p>') {
    return '<p></p>'
  }
  return sanitized
}

export function headingEditorContent(text: string | undefined | null): string {
  // Heading is always plain; never treat as HTML.
  return escapeHtml(text ?? '')
}

export function textEditorContent(stored: string | undefined | null): string {
  const { mode, content } = unwrapStoredText(stored)
  if (mode === 'html') return normalizeTextHtml(content)
  // Plain → single paragraph of escaped text; newlines become <br /> for editor UX.
  if (!content) return '<p></p>'
  const parts = content.split(/\n/)
  return `<p>${parts.map(escapeHtml).join('<br />')}</p>`
}

export function serializeHeadingFromEditor(plainOrHtml: string): string {
  // Prefer explicit plain extraction: strip tags after sanitize path.
  return htmlToPlainText(plainOrHtml)
}

export function serializeTextFromEditor(html: string, opts?: { forcePlain?: boolean }): string {
  const sanitized = normalizeTextHtml(html)
  if (opts?.forcePlain) return htmlToPlainText(sanitized)

  // If content has no marks and is a single paragraph of text, store as plain for compat.
  if (isTrivialPlainParagraph(sanitized)) {
    return htmlToPlainText(sanitized)
  }
  return wrapRichTextHtml(sanitized)
}

function isTrivialPlainParagraph(html: string): boolean {
  // Single <p>…</p> with only text/br, no marks. Multi-paragraph stays marked rich.
  if (/<(strong|em|b|i|u|s)\b/i.test(html)) return false
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
  // Trim trailing newline introduced by closing </p>
  return text.replace(/\n$/, '')
}

/**
 * Frontend Text render model. Legacy unmarked strings stay exact plain children.
 * Marked rich strings render sanitized HTML only.
 */
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
