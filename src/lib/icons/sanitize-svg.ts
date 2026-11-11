/**
 * SSR-safe SVG allowlist sanitizer for Media Library icons.
 * Strips scripts, event handlers, foreignObject, and unsafe external refs.
 */

const FORBIDDEN_TAGS =
  /<\/?(?:script|foreignObject|iframe|object|embed|link|meta|base|use)\b[^>]*>/gi

const EVENT_ATTR = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi

const DANGEROUS_URL =
  /(?:href|xlink:href|src)\s*=\s*(?:"\s*(?:javascript|data\s*:\s*text\/html|data\s*:\s*image\/svg)|'\s*(?:javascript|data\s*:\s*text\/html|data\s*:\s*image\/svg))/gi

const EXTERNAL_REF =
  /(?:href|xlink:href)\s*=\s*(?:"https?:\/\/[^"]*"|'https?:\/\/[^']*'|https?:\/\/[^\s>]+)/gi

const STYLE_EXPRESSION = /expression\s*\(|url\s*\(\s*['"]?\s*(?:javascript|data\s*:)/gi

export function isSvgMimeType(mime?: string | null): boolean {
  if (!mime) return false
  const normalized = mime.toLowerCase()
  return normalized === 'image/svg+xml' || normalized === 'image/svg'
}

export function looksLikeSvgMarkup(raw: string): boolean {
  return /<svg[\s>]/i.test(raw)
}

export function sanitizeSvgMarkup(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null
  let svg = raw.trim()
  if (!looksLikeSvgMarkup(svg)) return null

  // Drop XML / DOCTYPE noise
  svg = svg.replace(/<\?xml[\s\S]*?\?>/gi, '').replace(/<!DOCTYPE[\s\S]*?>/gi, '')

  svg = svg
    .replace(FORBIDDEN_TAGS, '')
    .replace(EVENT_ATTR, '')
    .replace(DANGEROUS_URL, '')
    .replace(EXTERNAL_REF, '')
    .replace(STYLE_EXPRESSION, '')

  // Strip inline <script> bodies that survived tag stripping edge cases
  svg = svg.replace(/<script[\s\S]*?<\/script>/gi, '')

  if (!looksLikeSvgMarkup(svg)) return null
  return svg
}

/** Force currentColor inheritance when recoloring is supported. */
export function applySvgCurrentColor(svg: string): string {
  return svg
    .replace(/\sfill="(?!none)[^"]*"/gi, ' fill="currentColor"')
    .replace(/\sstroke="(?!none)[^"]*"/gi, ' stroke="currentColor"')
    .replace(/\sstyle="([^"]*)"/gi, (_m, style: string) => {
      const cleaned = String(style)
        .replace(/fill\s*:\s*(?!none)[^;]+/gi, 'fill:currentColor')
        .replace(/stroke\s*:\s*(?!none)[^;]+/gi, 'stroke:currentColor')
      return ` style="${cleaned}"`
    })
}
