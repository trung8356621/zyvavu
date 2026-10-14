import { isReservedPath, normalizePath } from '@/lib/url/normalize'

export const DEFAULT_POST_PERMALINK_STRUCTURE = '/%postname%.html'
export const DEFAULT_PAGE_PERMALINK_STRUCTURE = '/%slug%'
export const HOMEPAGE_PATH = '/'

export const SUPPORTED_TOKENS = ['%postname%'] as const

export const UNSUPPORTED_TOKENS = [
  '%category%',
  '%year%',
  '%monthnum%',
  '%month%',
  '%day%',
  '%hour%',
  '%minute%',
  '%second%',
  '%post_id%',
  '%id%',
  '%author%',
  '%tag%',
] as const

export interface PermalinkPreset {
  key: 'posts' | 'postname' | 'postname-html' | 'custom'
  label: string
  pattern: string
  example: string
}

export const PERMALINK_PRESETS: readonly PermalinkPreset[] = [
  {
    key: 'posts',
    label: 'Posts prefix',
    pattern: '/posts/%postname%',
    example: '/posts/sample-post',
  },
  {
    key: 'postname',
    label: 'Post name',
    pattern: '/%postname%',
    example: '/sample-post',
  },
  {
    key: 'postname-html',
    label: 'Post name with HTML extension',
    pattern: '/%postname%.html',
    example: '/sample-post.html',
  },
  {
    key: 'custom',
    label: 'Custom Structure',
    pattern: '',
    example: '',
  },
] as const

function isReservedPrefix(prefix: string): boolean {
  const normalized = prefix.toLowerCase()
  if (normalized === '/admin' || normalized.startsWith('/admin/')) return true
  if (normalized === '/api' || normalized.startsWith('/api/')) return true
  if (normalized === '/_next' || normalized.startsWith('/_next/')) return true
  if (normalized === '/icons' || normalized.startsWith('/icons/')) return true
  return false
}

export function normalizePermalinkPattern(raw?: string | null): string {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return DEFAULT_POST_PERMALINK_STRUCTURE
  }
  const trimmed = raw.trim()
  if (trimmed === 'posts') return '/posts/%postname%'
  if (trimmed === 'flat') return '/%postname%'
  if (trimmed === 'postname-html') return '/%postname%.html'
  if (trimmed === 'category') return '/%category%/%postname%'
  if (trimmed === 'date') return '/%year%/%monthnum%/%postname%'

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export function validatePermalinkPattern(pattern: unknown): string | null {
  if (typeof pattern !== 'string' || !pattern.trim()) {
    return 'A permalink structure is required.'
  }

  const trimmed = pattern.trim()

  // Malformed lone % check
  const percentCount = (trimmed.match(/%/g) || []).length
  if (percentCount % 2 !== 0) {
    return 'Malformed permalink structure: unmatched % token separator.'
  }

  // Detect explicit unsupported tokens
  for (const token of UNSUPPORTED_TOKENS) {
    if (trimmed.includes(token)) {
      return `The token '${token}' is not supported. Only %postname% is supported.`
    }
  }

  // Detect any other unknown %...% tokens
  const tokenMatches = trimmed.match(/%[^%]+%/g) || []
  for (const match of tokenMatches) {
    if (match !== '%postname%') {
      return `The token '${match}' is not supported. Only %postname% is supported.`
    }
  }

  // Must contain %postname%
  if (!trimmed.includes('%postname%')) {
    return 'Permalink structure must include the %postname% token.'
  }

  // Reject invalid characters: query, hash, backslash, spaces, quotes, etc.
  if (/[\s?#\\<>"'`;]/i.test(trimmed)) {
    return 'Permalink structure contains invalid characters.'
  }

  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`

  // Reject duplicate slashes
  if (/\/{2,}/.test(withSlash)) {
    return 'Permalink structure cannot contain duplicate slashes.'
  }

  // Reject path traversal
  const segments = withSlash.split('/')
  if (segments.some((seg) => seg === '.' || seg === '..')) {
    return 'Permalink structure cannot contain relative path navigation.'
  }

  // Check prefix
  const prefix = withSlash.split('%postname%')[0]
  const normalizedPrefix = prefix.length > 1 && prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
  if (normalizedPrefix && isReservedPrefix(normalizedPrefix)) {
    return 'Permalink structure prefix conflicts with a reserved system path.'
  }

  // Resolve with sample-post to check reserved paths
  try {
    const sample = resolvePostPath(withSlash, 'sample-post')
    if (isReservedPath(sample)) {
      return 'Permalink structure conflicts with a reserved system path.'
    }
  } catch (err) {
    return `Invalid permalink structure: ${(err as Error).message}`
  }

  return null
}

export function resolvePostPath(pattern: string, slug: string): string {
  const normalizedPattern = normalizePermalinkPattern(pattern)
  const resolved = normalizedPattern.replace(/%postname%/g, slug)
  return normalizePath(resolved)
}

export function extractSlugAndPattern(canonicalPath: string): { slug: string; pattern: string } | null {
  try {
    const hasHtml = canonicalPath.toLowerCase().endsWith('.html')
    const withoutExt = hasHtml ? canonicalPath.slice(0, -5) : canonicalPath
    const lastSlash = withoutExt.lastIndexOf('/')
    if (lastSlash === -1) return null
    const slug = withoutExt.slice(lastSlash + 1)
    const prefix = withoutExt.slice(0, lastSlash)
    if (!slug) return null
    const pattern = `${prefix}/%postname%${hasHtml ? '.html' : ''}`
    return { slug, pattern }
  } catch {
    return null
  }
}

export function extractPatternWithOldSlug(canonicalPath: string, oldSlug: string): string | null {
  if (!canonicalPath || !oldSlug) return null
  if (canonicalPath.endsWith(`/${oldSlug}.html`)) {
    const prefix = canonicalPath.slice(0, canonicalPath.length - oldSlug.length - 6)
    return `${prefix}/%postname%.html`
  }
  if (canonicalPath.endsWith(`/${oldSlug}`)) {
    const prefix = canonicalPath.slice(0, canonicalPath.length - oldSlug.length - 1)
    return `${prefix}/%postname%`
  }
  return null
}

export function resolveEstablishedOrPattern(
  canonicalPath: string | null | undefined,
  oldSlug: string | null | undefined,
  newSlug: string,
  defaultPattern: string,
): string {
  if (canonicalPath) {
    if (oldSlug) {
      const patternFromOldSlug = extractPatternWithOldSlug(canonicalPath, oldSlug)
      if (patternFromOldSlug) {
        return resolvePostPath(patternFromOldSlug, newSlug)
      }
    }
    const extracted = extractSlugAndPattern(canonicalPath)
    if (extracted) {
      return resolvePostPath(extracted.pattern, newSlug)
    }
  }
  return resolvePostPath(defaultPattern, newSlug)
}
